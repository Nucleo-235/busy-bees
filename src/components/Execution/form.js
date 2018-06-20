import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';

import * as moment from 'moment';
import * as qs from 'qs';

// import { Link } from 'react-router-dom';

import * as routes from '../../constants/routes';

import { db } from '../../firebase';
import withAuthorization from '../Session/withAuthorization';
import { mapToArray } from '../../utils/listUtils';

import './form.css';

import { Form, Select, InputNumber, Input, Button, DatePicker, Checkbox } from 'antd';
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
  hive: null,
  project: null,
  error: null,
  projectSelectorVisibile: true,
  planned: false,
};

class ExecutionFormPage extends Component {
  constructor(props) {
    super(props);
    this.state = { ...INITIAL_STATE, 
      date: moment().startOf('day'),
    }
  }

  checkHives() {
    if (!this.state.hives) {
      db.onceGetHivesWithProjects().then(hives => {
        this.setState(updateByPropertyName('hives', hives))
        this.props.onSetHives(hives)

        const keys = Object.keys(hives);
        if (!this.state.hive && keys.length === 1) {
          const selectedHiveKey = keys[0];
          const selectedHive = hives[selectedHiveKey];
          const updatedState = { hive: selectedHiveKey };
          if (!this.state.project) {
            const projectKeys = Object.keys(selectedHive.projects);
            if (projectKeys.length === 1)  {
              updatedState.project = projectKeys[0];
            }
          }
          this.setState(() => ({ ...updatedState }));
        }
      });
    }
  }

  parseExtraParams() {
    const queryData = qs.parse(this.props.location.search.replace(/^\?+/g, ''));
    if (queryData.date) {
      const momementDate = moment(queryData.date, DefaultDateDBFormat);
      this.setState(() => ({ ...{
        date: momementDate,
      } }));
    }
  }

  componentDidMount() {
    if (this.props.match.params.hive) {
      const hive = this.props.match.params.hive;
      if (this.props.match.params.key) {
        const executionKey = this.props.match.params.key;
        db.onceGetExecutionSnapshot(hive, executionKey).then(executionSnap => {
          const data = executionSnap.val();
          data.hive = hive;
          data.key = executionKey;
          data.date = moment(data.date, DefaultDateDBFormat);
          this.setState(() => ({ ...data }));
        });
      } else if (this.props.match.params.project) {
        const project = this.props.match.params.project; 
        this.setState(() => ({ ...{
          hive,
          project,
          projectSelectorVisibile: false,
        } }));
      } else {
        this.parseExtraParams();
      }
    }

    this.checkHives();
    this.parseExtraParams();
  }

  onSubmit = (event) => {
    const {
      key,
      hive,
      project,
      hours,
      date,
      difficulty,
      description,
      participant,
      planned
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

    if (date > moment().endOf('day')) {
      execution.planned = true;
    } else if (date >= moment().startOf('day')) {
      execution.planned = planned;
    }

    db.saveExecution(hive, execution, key)
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
    if (participants) {
      return <FormItem><Select value={participant} onChange={value => this.setState(updateByPropertyName('participant', value))}>
        {Object.keys(participants).map(key =>
          <Option key={key} value={key}>{participants[key].name || key}</Option>
        )}
      </Select></FormItem>
    } else
      return <FormItem><div>No Participants loaded</div></FormItem>
  }

  renderHives(hives, hive) {
    return <FormItem><Select value={hive} onChange={value => this.setState(updateByPropertyName('hive', value))}>
        {Object.keys(hives).map(hiveKey =>
          <Option key={hiveKey} value={hiveKey}>{hives[hiveKey].name || hiveKey}</Option>
        )}
      </Select></FormItem>;
  }

  renderProjects(projects, project) {
    return <FormItem><Select value={project} onChange={value => this.setState(updateByPropertyName('project', value))}>
        {projects.map(projectData =>
          <Option key={projectData.key} value={projectData.key}>{projectData.name || projectData.key}</Option>
        )}
      </Select></FormItem>
  }

  renderStandardForm() {
    const {
      hives,
      hive,
      project,
      hours,
      difficulty,
      date,
      description,
      participant,
      planned,
      error,
    } = this.state;

    const participants = hives[hive].projects[project].participants;

    const startOfToday = moment().startOf('day');
    const endOfToday = moment().endOf('day');

    const isInvalid =
      hive === null ||
      project === null ||
      hours === null ||
      date === null ||
      participant === null;

    return (
      <div>
        <FormItem>
          <DatePicker value={date} format={DefaultDatePrettyFormat}
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

        {this.renderParticipantsSelect(participants, participant)}

        <TextArea
          value={description}
          onChange={event => this.setState(updateByPropertyName('description', event.target.value))}
          placeholder="Descrição"
        />

        { date >= startOfToday && date<= endOfToday && <FormItem>
          <Checkbox
            checked={planned}
            onChange={value => this.setState(updateByPropertyName('planned', planned))}
          >Planejada?</Checkbox>
        </FormItem>}
        
        <Button type="primary" htmlType="submit" disabled={isInvalid}>
          Salvar
        </Button>

        { error && <p>{error.message}</p> }
      </div>
    );
  }

  render() {
    const {
      key,
      hives,
      hive,
      project,
      projectSelectorVisibile,
    } = this.state;

    const projectModel = hives && hive && project ? hives[hive].projects[project] : null;

    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        { !projectSelectorVisibile && projectModel && <h2>{projectModel.name}</h2> }
        <h3>{ key ? 'Alterar Execução' : 'Nova Execução' }</h3>
        <Form onSubmit={this.onSubmit} className="execution-form" style={{ textAlign: "left", maxWidth: "600px", display: "inline-block"}}>
          { projectSelectorVisibile && hives && this.renderHives(hives, hive) }
          { projectSelectorVisibile && hives && hive && this.renderProjects(mapToArray(hives[hive].projects), project) }
          { hives && hive && project && this.renderStandardForm() }
        </Form>
      </div>
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
  connect(mapStateToProps, mapDispatchToProps)
)(withRouter(ExecutionFormPage));