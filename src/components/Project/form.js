import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';

import { Form, Select, InputNumber, Input, Button, DatePicker, Checkbox, Row, Col } from 'antd';

import * as moment from 'moment';

// import { Link } from 'react-router-dom';

import * as routes from '../../constants/routes';

import { db } from '../../firebase';
import withAuthorization from '../Session/withAuthorization';

import './form.css';

import { DefaultDatePrettyFormat, DefaultDateDBFormat } from '../../utils/dateUtils'
import { updateByPropertyName, removeUndefined, convertDates } from '../../utils/stateUtils'
import { mapToArray } from '../../utils/listUtils';

const { TextArea } = Input;
const FormItem = Form.Item;
const Option = Select.Option;
const CheckboxGroup = Checkbox.Group;

const PROJECT_TYPES = {
  single: { code: "single", name: 'Único' },
  recurrent:  { code: "recurrent", name: 'Recorrente' },
}

const INITIAL_STATE = {
  projectKey: null,
  name: '',
  description: '',
  rawPrice: null,
  taxPct: null,
  startAt: moment().startOf('day'),
  finished: false,
  participants: { },
  type: PROJECT_TYPES.recurrent.code
};

class ProjectFormPage extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      isNew: true, 
      hives: null,
      hive: null,
      data: { ...INITIAL_STATE }, };
  }

  checkHives() {
    if (!this.state.hives) {
      db.onceGetHivesWithProjects().then(db.loadHiveTeams).then(hives => {
        this.setState(updateByPropertyName('hives', hives))
        this.props.onSetHives(hives)

        const keys = Object.keys(hives);
        if (!this.state.hive && keys.length === 1) {
          const selectedHiveKey = keys[0];
          const updatedState = { hive: selectedHiveKey };
          this.setState(() => ({ ...this.state, ...updatedState }));
        }
      });
    }
  }

  componentDidMount() {
    if (this.props.match.params.hive) {
      const hive = this.props.match.params.hive;
      if (this.props.match.params.key) {
        const projectKey = this.props.match.params.key;
        db.onceGetProjectSnapshot(hive, projectKey).then(snap => {
          let data = snap.val();
          let isNew = false;
          if (!data) {
            data = { ...INITIAL_STATE };
            isNew = true;
          }
          if (!data.type)
            data.type = PROJECT_TYPES.single.code;
          if (!data.projectKey)
            data.projectKey = projectKey;
          this.setState(() => ({ ...this.state, isNew: isNew, hive, data }));
        });
      } else {
        this.setState(() => ({ ...this.state, hive }));
      }
    }

    this.checkHives();
  }

  doSave(formValues) {
    const hive = formValues.hive || this.state.hive;
    const projectKey = formValues.projectKey || this.state.data.projectKey;
    
    const values = convertDates(removeUndefined(formValues), DefaultDateDBFormat);    
    delete values.hive;

    const participants = { };
    values.participants.forEach(p => { participants[p] = true; });
    values.participants = participants;

    if (values.taxPct) {
      values.taxPct = values.taxPct * 0.01;
    }

    const { history } = this.props;

    if (this.state.data.summary)
      values.summary = this.state.data.summary;

    db.saveProject(hive, values, projectKey)
      .then((result) => {
        history.push(routes.HOME);
      })
      .catch(error => {
        this.setState(updateByPropertyName('error', error));
      });
  }

  onSubmit = (event) => {
    event.preventDefault();

    const { validateFields } = this.props.form;
    validateFields((err, values) => {
      if (err) {
        this.setState({ ...this.state, errors: err });
      } else {
        this.doSave(values);
      }
    });
  }

  renderSetupForm(hives, hive) {
    const { getFieldDecorator } = this.props.form;
    const { data } = this.state;

    return (<Row gutter={5}>
        <Col md={12}>
          <FormItem label="Colméia">
            {getFieldDecorator('hive', {
              initialValue: hive,
              rules: [{ required: true, message: 'Colméia obrigatória' }],
            })(<Select>
                {Object.keys(hives).map(hiveKey =>
                  <Option key={hiveKey} value={hiveKey}>{hives[hiveKey].name || hiveKey}</Option>
                )}
              </Select>
            )}
          </FormItem>
        </Col>
        <Col md={12}>
          <FormItem label="Chave do Projeto" help="Será usada como identificado, ex: na URL">
            {getFieldDecorator('projectKey', {
              initialValue: data.projectKey,
              rules: [{ required: true, message: 'Chave obrigatória' }],
            })(<Input placeholder="Ex: PROJ-123" />)}
          </FormItem>
        </Col>
          </Row>);
  }

  renderRecurrentForm() {
    const { data } = this.state;
    const { getFieldDecorator } = this.props.form;

    return (
      <div>
        <Col md={8}>
          <FormItem label="Período">
            {getFieldDecorator('period', {
              initialValue: data.period,
              rules: [{ required: true, message: 'Período obrigatório' }],
            })(<Select>
              <Option value="month">Mensal</Option>
              <Option value="bimonth">Bimestral</Option>
            </Select>)}
          </FormItem>
        </Col>
      </div>
    );
  }

  renderSingleForm() {
    const { data } = this.state;
    const { getFieldDecorator } = this.props.form;

    return (<div>
      <Col md={8}>
        <FormItem label="Dificuldade">
          {getFieldDecorator('totalDifficulty', {
            initialValue: data.totalDifficulty,
            rules: [
              { required: true, message: 'Dificuldade obrigatória' },
              {
                message: 'Dificuldade deve ser maior ou igual a 0',
                validator: (rule, value, callback) => {
                  callback(value >= 0 ? [] : ['Dificuldade deve ser maior ou igual a 0']);
                },
              }
            ],
          })(<InputNumber min={0} step={1} placeholder="Ex: 1000" />)}
        </FormItem>
      </Col>
      <Col md={8}>
        <FormItem label="Data de Entrega">
          {getFieldDecorator('deadline', {
            initialValue: (data.deadlineDateValue ? moment(data.deadlineDateValue) : null),
          })(<DatePicker format={DefaultDatePrettyFormat} />)}
        </FormItem>
      </Col>
    </div>);
  }

  renderForm() {
    const {
      hives,
      hive,
      data,
      selectedType,
    } = this.state;

    const { getFieldDecorator, getFieldValue } = this.props.form;

    const teamAsList = mapToArray(hives[hive].team || {});
    const teamOptions = teamAsList.map(i => { 
      return { label: (i.name || i.key), value: i.key }
    });

    let typeForm = null;
    const finalType = selectedType || data.type;
    if (finalType) {
      if (finalType === PROJECT_TYPES.recurrent.code) {
        typeForm = this.renderRecurrentForm();
      } else {
        typeForm = this.renderSingleForm();
      }
    }

    const isFinihsed = !!getFieldValue('finished') || !!data.finished;
    const finishForm = (<div>
      <Col md={{span: 8, offset: (isFinihsed ? 8 : 16)}}>
        <FormItem wrapperCol={{ style: { textAlign: "right" }} }>
          {getFieldDecorator('finished', { initialValue: !!data.finished }
          )(<Checkbox>Finalizado?</Checkbox>)}
        </FormItem>
      </Col>
      {isFinihsed && <Col md={{span: 8}}>
        <FormItem label="Data de Finalização" help="Data que o projeto foi finalizado">
          {getFieldDecorator('doneAt', {
            initialValue: data.doneAtDateValue ? moment(data.doneAtDateValue) : null,
            rules: [{ required: true, message: 'Data de Finalização obrigatória' } ],
          })(<DatePicker format={DefaultDatePrettyFormat} />)}
        </FormItem>
      </Col>}
    </div>);

    return (
      <div>
        <Row gutter={5}>
          <Col md={8}>
            <FormItem label="Nome">
              {getFieldDecorator('name', {
                initialValue: data.name,
                rules: [{ required: true, message: 'Nome obrigatório' }],
              })(<Input placeholder="Ex: Projeto ABC" />)}
            </FormItem>
          </Col>
          <Col md={8}>
            <FormItem label="Código do pedido">
              {getFieldDecorator('order', {
                initialValue: data.order,
              })(<Input placeholder="Ex: 000101-A" />)}
            </FormItem>
          </Col>
          <Col md={8}>
            <FormItem label="Tipo">
              {getFieldDecorator('type', {
                initialValue: data.type,
                rules: [{ required: true, message: 'Tipo obrigatório' }],
              })(<Select onChange={e => {
                this.setState({ ...this.state, selectedType: e })
              }}>
                {Object.keys(PROJECT_TYPES).map(typeKey =>
                  <Option key={typeKey} value={PROJECT_TYPES[typeKey].code}>{PROJECT_TYPES[typeKey].name || typeKey}</Option>
                )}
              </Select>)}
            </FormItem>
          </Col>
        </Row>
        <Row gutter={5}>
          <Col md={8}>
            <FormItem label="Preço (bruto)">
              {getFieldDecorator('rawPrice', {
                initialValue: data.rawPrice,
                rules: [
                  { required: true, message: 'Preço obrigatório' },
                  {
                    message: 'Preço deve ser maior que 0',
                    validator: (rule, value, callback) => {
                      callback(value && value < 0 ? ['Preço deve ser maior que 0'] : []);
                    },
                  }
                ],
              })(<InputNumber min={0} step={1} placeholder="Ex: 1000,00" />)}
            </FormItem>
          </Col>
          <Col md={8}>
            <FormItem label="Imposto %">
              {getFieldDecorator('taxPct', {
                initialValue: data.taxPct ? data.taxPct * 100 : null,
                rules: [
                  { required: true, message: 'Imposto obrigatório' },
                  {
                    message: 'Imposto deve ser maior ou igual a 0',
                    validator: (rule, value, callback) => {
                      callback(value >= 0 ? [] : ['Imposto deve ser maior ou igual a 0']);
                    },
                  }
                ],
              })(<InputNumber min={0} step={1} placeholder="Ex: 10%" />)}
            </FormItem>
          </Col>
          <Col md={8}>
            <FormItem label="Data Kick-Off" help="Data que o projeto foi/será iniciado">
              {getFieldDecorator('startAt', {
                initialValue: data.startAtDateValue ? moment(data.startAtDateValue) : null,
                rules: [{ required: true, message: 'Data Kick-Off obrigatória' } ],
              })(<DatePicker format={DefaultDatePrettyFormat} />)}
            </FormItem>
          </Col>
        </Row>

        {finalType && <Row gutter={5}>
          {typeForm}
        </Row>}

        <FormItem label="Time">
          {getFieldDecorator('participants', { 
            initialValue: Object.keys(data.participants || {}),
          })(<CheckboxGroup options={teamOptions} />)}
        </FormItem>

        <FormItem label="Descrição do projeto">
          {getFieldDecorator('description', { initialValue: data.description }
          )(<TextArea placeholder="Descrição" rows={4} />)}
        </FormItem>

        <Row gutter={5}>
          {finishForm}
        </Row>
        
        <Row>
          <Col md={{span: 8, push: 8}}>
            <FormItem>
              <Button type="primary" block htmlType="submit">Salvar</Button>
            </FormItem>
          </Col>
        </Row>
      </div>
    );
  }

  render() {
    const { hives, hive, isNew } = this.state;
    const { getFieldValue } = this.props.form;

    const finalHive = getFieldValue('hive') || hive;
    const hiveSet = hives && finalHive;

    return (
      <Row className="project-form">
        <Col md={{span: 12, push: 6 }} >
          <h2>{ isNew ? 'Novo Projeto' : 'Alterar Projeto' }</h2>
          <Form onSubmit={this.onSubmit}>
            { isNew && hives && this.renderSetupForm(hives, finalHive) }
            { hiveSet && this.renderForm() }
          </Form>
        </Col>
      </Row>
    );
  }
}

const mapStateToProps = (state) => { 
  return ({
    hives: state.hiveState.hives,
    authUser: state.sessionState.authUser,
  });
}

const mapDispatchToProps = (dispatch) => ({
  onSetHives: (hives) => dispatch({ type: 'HIVES_SET', hives })
});

const authCondition = (authUser) => !!authUser;

export default compose(
  withAuthorization(authCondition),
  connect(mapStateToProps, mapDispatchToProps),
  Form.create({})
)(withRouter(ProjectFormPage));