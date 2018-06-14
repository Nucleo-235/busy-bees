import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';

import * as routes from '../../constants/routes';

import { db } from '../../firebase';
import withAuthorization from '../Session/withAuthorization';

import { ExecutionList } from './list';
import { snapToArray } from '../../utils/listUtils';

const INITIAL_STATE = {
  hive: null,
  project: null,
  projectModel: null,
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
      executions,
    } = this.state;

    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        { projectModel && <h2>{projectModel.name}</h2> }
        <h3>Execuções</h3>
        {executions && <ExecutionList hive={hive} executions={executions} />}
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