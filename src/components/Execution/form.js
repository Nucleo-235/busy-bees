import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';

// import { Link } from 'react-router-dom';

import * as routes from '../../constants/routes';

import { db } from '../../firebase';
import withAuthorization from '../Session/withAuthorization';

import { Form, Select, InputNumber, Input, Button, DatePicker } from 'antd';
const Option = Select.Option;
const { TextArea } = Input;
const FormItem = Form.Item;

const updateByPropertyName = (propertyName, value) => () => ({
  [propertyName]: value,
});
const updateNumberByPropertyName = (propertyName, value) => () => ({
  [propertyName]: isNaN(Number(value)) ? null : Number(value),
});

const INITIAL_STATE = {
  key: null,
  hours: null,
  date: null,
  dateStr: null,
  difficulty: null,
  description: '',
  participant: null,
  participants: null,
  error: null,
};

class ExecutionFormPage extends Component {
  constructor(props) {
    super(props);
    this.state = { ...INITIAL_STATE };
  }

  componentDidMount() {
    if (!this.props.match.params.hive || !this.props.match.params.project) {
      this.props.history.push(routes.HOME);
      return;
    }
    const hive = this.props.match.params.hive;
    const project = this.props.match.params.project;

    db.onceGetParticipants(hive, project).then(participants => {
      this.setState(() => ({ ...{
        hive, project, participants, key: this.props.match.params.key
      } }));
    }, error => {
      this.props.history.push(routes.HOME);
    })

  }

  onSubmit = (event) => {
    const {
      hive,
      project,
      hours,
      date,
      difficulty,
      description,
      participant,
    } = this.state;

    const {
      history,
    } = this.props;

    const execution = {
      hours,
      date,
      participant,
      project,
    }

    if (difficulty) {
      execution.difficulty = difficulty;
    }
    if (description) {
      execution.description = description;
    }

    db.doCreateExecution(hive, execution)
      .then((result) => {
        const { onSetHives } = this.props;
        db.firstProjectSummaryChange(hive, project).then(changedSnapshot => {
          if (changedSnapshot) {
            db.onceGetHivesWithProjects().then(snapshot =>
              onSetHives(snapshot)
            );
          }
        });

        this.setState(() => ({ ...INITIAL_STATE }));
        history.push(routes.HOME);
      })
      .catch(error => {
        this.setState(updateByPropertyName('error', error));
      });

    event.preventDefault();
  }

  renderParticipantsSelect(participants) {
    if (participants)
      return <Select onChange={value => this.setState(updateByPropertyName('participant', value))}>
        {Object.keys(participants).map(key =>
          <Option key={key} value={key}>{participants[key].name || key}</Option>
        )}
      </Select>
    else
      return <div>No Participants loaded</div>  
  }

  render() {
    const {
      hours,
      difficulty,
      dateObj,
      date,
      description,
      participant,
      participants,
      error,
    } = this.state;

    const isInvalid =
      hours === null ||
      date === null ||
      participant === null;

    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        <h2>Nova Execução</h2>
        <Form onSubmit={this.onSubmit} className="execution-form" style={{ textAlign: "left", maxWidth: "300px", display: "inline-block"}}>
          <FormItem>
            <DatePicker value={dateObj} 
              onChange={(value, valueStr) => { 
                this.setState(updateByPropertyName('dateObj', value));
                this.setState(updateByPropertyName('date', valueStr));
              }}
            />
          </FormItem>
          <FormItem>
            <InputNumber
              value={hours}
              min={0} step={0.01}
              onChange={value => this.setState(updateNumberByPropertyName('hours', value))}
              placeholder="Horas"
              required
            />
          </FormItem>
          <FormItem>
            <InputNumber
              value={difficulty}
              min={0} step={0.01}
              onChange={value => this.setState(updateNumberByPropertyName('difficulty', value))}
              placeholder="Dificuldade"
            />
          </FormItem>

          <FormItem>
            {this.renderParticipantsSelect(participants)}
          </FormItem>

          <TextArea
            value={description}
            onChange={event => this.setState(updateByPropertyName('description', event.target.value))}
            placeholder="Descrição"
          />
          
          <Button type="primary" htmlType="submit" disabled={isInvalid}>
            Salvar
          </Button>

          { error && <p>{error.message}</p> }
        </Form>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  authUser: state.sessionState.authUser,
});

const mapDispatchToProps = (dispatch) => ({
  onSetHives: (hives) => dispatch({ type: 'HIVES_SET', hives }),
});

const authCondition = (authUser) => !!authUser;

export default compose(
  withAuthorization(authCondition),
  connect(mapStateToProps, mapDispatchToProps)
)(withRouter(ExecutionFormPage));