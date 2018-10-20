import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';

import { db } from '../../firebase';
import withAuthorization from '../Session/withAuthorization';

import { ExecutionList } from './list';
import { mapToArray } from '../../utils/listUtils';

const INITIAL_STATE = {
  executions: null,
};

class UserExecutionListPage extends Component {
  constructor(props) {
    super(props);
    this.state = { ...INITIAL_STATE };
  }

  componentDidMount() {
    db.onceGetUserExecutionsMap().then(executions => {
      this.setState(() => ({ ...{
        executions: mapToArray(executions).sort((a, b) => (b.dateValue || 0) - (a.dateValue || 0))
      } }));
    });

  }

  render() {
    const {
      executions,
    } = this.state;

    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        <h3>Minhas Execuções</h3>
        {executions && <ExecutionList executions={executions} showEarned={false} showProject={true} />}
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
)(withRouter(UserExecutionListPage));