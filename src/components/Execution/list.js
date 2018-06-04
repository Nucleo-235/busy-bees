import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';

import { Card, Row, Col } from 'antd';

import * as routes from '../../constants/routes';

import { db } from '../../firebase';
import withAuthorization from '../Session/withAuthorization';

import './list.css';

const INITIAL_STATE = {
  hive: null,
  project: null,
  projectModel: null,
  participants: null,
  executions: null,
};

class ExecutionListPage extends Component {
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
      const executions = executionsSnap.val();
      this.setState(() => ({ ...{
        executions
      } }));
    });

  }

  render() {
    const {
      projectModel,
      executions,
    } = this.state;

    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        { projectModel && <h2>{projectModel.name}</h2> }
        <h3>Execuções</h3>
        <div className="list executions-list">
          <Row gutter={8}>
            {executions && Object.keys(executions).map(executionKey =>
              <Col key={executionKey} md={{span: 6}} sm={{span: 12}} xs={{span: 24}} className="item executionItem">
                <Card title={<div><span className="left">{executions[executionKey].participant}</span><span className="right">{executions[executionKey].date}</span></div>}>
                  {executions[executionKey].description && <p>{executions[executionKey].description}</p>}
                  <div className="side-info">
                    <div>
                      <span>Horas:</span>
                      <span>{executions[executionKey].hours}</span>
                    </div>
                    { executions[executionKey].difficulty && <div>
                      <span>Dificuldade:</span>
                      <span>{executions[executionKey].difficulty}</span>
                      </div>
                    }
                  </div>
                </Card>
              </Col>
            )}
          </Row>
        </div>
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
)(withRouter(ExecutionListPage));