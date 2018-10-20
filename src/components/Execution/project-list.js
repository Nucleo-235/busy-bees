import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';

import * as routes from '../../constants/routes';

import { db } from '../../firebase';
import withAuthorization from '../Session/withAuthorization';

import { ExecutionList } from './list';
import { snapToArray } from '../../utils/listUtils';
import { updateByPropertyName } from '../../utils/stateUtils'

import { getParticipants } from '../../shared-lib/models/project'
import { getPriorities } from '../../shared-lib/models/priority'

const INITIAL_STATE = {
  hive: null,
  project: null,
  projectModel: null,
  hivePriorities: null,
  hiveParticipants: null,
  participants: null,
  executions: null,
};

class ProjectExecutionListPage extends Component {
  constructor(props) {
    super(props);
    this.state = { ...INITIAL_STATE };
  }

  componentDidMount() {
    let {
      hive,
      hivePriorities,
      hiveParticipants,
      project,
      projectModel,
    } = this.state;

    hive = hive || this.props.match.params.hive;
    project = project || this.props.match.params.project;
    if (!hive || !project) {
      this.props.history.push(routes.HOME);
      return;
    }

    if (!projectModel) {
      db.onceGetProjectSnapshot(hive, project).then(projectSnap => {
        const projectModel = projectSnap.val();
        this.setState(() => ({ ...{
          hive, project, 
          projectModel: projectModel,
          participants: projectModel.participants, 
        } }));
      });
    }

    if (!hivePriorities) {
      db.onceGetHivePrioritiesSnapshot(hive).then(snap => {
        this.setState(updateByPropertyName('hivePriorities', snap.val()));
      });
    }

    if (!hiveParticipants) {
      db.onceGetHiveTeamSnapshot(hive).then(snap => {
        this.setState(updateByPropertyName('hiveParticipants', snap.val()));
      });
    }

    db.onceGetProjectExecutionsSnapshot(hive, project).then(executionsSnap => {
      this.setState(() => ({ ...{
        executions: snapToArray(executionsSnap).sort((a, b) => (b.dateValue || 0) - (a.dateValue || 0))
      } }));
    });

  }

  render() {
    const {
      projectModel,
      hive,
      hivePriorities,
      hiveParticipants,
      executions,
    } = this.state;

    let prioritiesMap = {};
    let participantsMap = {};
    if (projectModel) {
      participantsMap = projectModel.participants || {}
      if (hivePriorities)
        prioritiesMap = getPriorities(hivePriorities, projectModel.priorities);

      if (hiveParticipants) {
        participantsMap = getParticipants(hiveParticipants || {}, projectModel.participants || {});
      }
    }

    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        { projectModel && <h2>{projectModel.name}</h2> }
        <h3>Execuções</h3>
        {executions && <ExecutionList hive={hive} executions={executions} showSpent={true} showEarned={true} 
          project={projectModel} prioritiesMap={prioritiesMap} participantsMap={participantsMap} />}
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  authUser: state.sessionState.authUser,
});

const authCondition = (authUser) => !!authUser;

export default compose(
  withAuthorization(authCondition),
  connect(mapStateToProps)
)(withRouter(ProjectExecutionListPage));