import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';

import * as moment from 'moment';

// import { Link } from 'react-router-dom';

import * as routes from '../../constants/routes';

import { db } from '../../firebase';
import withAuthorization from '../Session/withAuthorization';

import { Form, Select, InputNumber, Input, Button, DatePicker } from 'antd';
const Option = Select.Option;
const { TextArea } = Input;
const FormItem = Form.Item;

const DefaultDatePrettyFormat = "YYYY-MM-DD";
const DefaultDateDBFormat = "YYYY-MM-DD";

const updateByPropertyName = (propertyName, value) => () => ({
  [propertyName]: value,
});

const INITIAL_STATE = {
  key: null,
  hours: null,
  date: moment().startOf('day'),
  difficulty: null,
  description: '',
  participant: null,
  participants: null,
  projectModel: null,
  error: null,
};

class ExecutionFormPage extends Component {
  constructor(props) {
    super(props);
    this.state = { ...INITIAL_STATE, 
      date: moment().startOf('day'),
    }
  }

  componentDidMount() {
    if (!this.props.match.params.hive || !this.props.match.params.project) {
      this.props.history.push(routes.HOME);
      return;
    }
    const hive = this.props.match.params.hive;
    const project = this.props.match.params.project;

    db.onceGetProjectSnapshot(hive, project).then(projectSnap => {
      const projectModel = projectSnap.val();
      const participantKeys = projectModel.participants ? Object.keys(projectModel.participants) : [];
      const participant = (participantKeys.length === 1 ? participantKeys[0] : null) || this.state.participant;
      this.setState(() => ({ ...{
        hive, project, 
        key: this.props.match.params.key,
        projectModel: projectModel,
        participants: projectModel.participants, 
        participant
      } }));
    });
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
      date: date.format(DefaultDateDBFormat),
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

  renderParticipantsSelect(participants, participant) {
    if (participants)
      return <Select defaultValue={participant} onChange={value => this.setState(updateByPropertyName('participant', value))}>
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
      date,
      description,
      participant,
      participants,
      projectModel,
      error,
    } = this.state;

    const isInvalid =
      hours === null ||
      date === null ||
      participant === null;

    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        { projectModel && <h2>{projectModel.name}</h2> }
        <h3>Nova Execução</h3>
        <Form onSubmit={this.onSubmit} className="execution-form" style={{ textAlign: "left", maxWidth: "300px", display: "inline-block"}}>
          <FormItem>
            <DatePicker defaultValue={moment().startOf('day')} value={date} format={DefaultDatePrettyFormat}
              onChange={value => this.setState(updateByPropertyName('date', value))}
            />
          </FormItem>
          <FormItem>
            <InputNumber
              value={hours}
              min={0} step={0.01}
              onChange={value => this.setState(updateByPropertyName('hours', value))}
              placeholder="Horas"
              required
            />
          </FormItem>
          <FormItem>
            <InputNumber
              value={difficulty}
              min={0} step={0.01}
              onChange={value => this.setState(updateByPropertyName('difficulty', value))}
              placeholder="Dificuldade"
            />
          </FormItem>

          <FormItem>
            {this.renderParticipantsSelect(participants, participant)}
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