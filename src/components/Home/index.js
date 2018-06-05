import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';

import { db } from '../../firebase';

import { Link } from 'react-router-dom';
import * as routes from '../../constants/routes';

import { Row, Col, Card, Progress } from "antd";

import './index.css';

class HomePage extends Component {
  componentDidUpdate() {
    this.loadHives();
  }
  componentDidMount() {
    this.loadHives();
  }
  loadHives() {
    const { onSetHives, authUser } = this.props;

    if (authUser) {
      db.onceGetHivesWithProjects().then(snapshot =>
        onSetHives(snapshot)
      );
    } 
  }

  render() {
    const { hives, authUser } = this.props;

    var hivesComponent = authUser && !!hives ? <HiveList hives={hives} /> : "";
    return (
      <div>
        <h1>Home</h1>
        {hivesComponent}
      </div>
    );
  }
}

const ProgressItem = ({pct, title}) =>
  <div className="progress">
    <div className="">
      <Progress type="circle" percent={Math.round(pct*100)} />
    </div>
    <div span={24} className="title">{title}</div>
  </div>

const ValueItem = ({value, title}) =>
  <div className="value-item">
    <div className="value">
      {value}
    </div>
    <div span={24} className="title">{title}</div>
  </div>

const ProjectSummary = ({summary}) =>
  <div>
    { summary.difficultyProgress && <ProgressItem pct={summary.difficultyProgress} title={'Progresso'} /> }
    { summary.spentProgress && <ProgressItem pct={summary.spentProgress} title={'Gasto $'} /> }
    { !summary.difficultyProgress && !summary.amountSpentPending && <ValueItem value={summary.amountSpent} title={'Gasto $'} /> }
    { !summary.difficultyProgress && summary.amountSpentPending &&<ValueItem value={summary.amountSpentPending} title={'Pendente $'} /> }
    { !summary.spentProgress && !summary.doneHoursPending && <ValueItem value={summary.doneHours} title={'Gasto (h)'} /> }
    { !summary.difficultyProgress && summary.doneHoursPending && <ValueItem value={summary.doneHoursPending} title={'Pendente $'} /> }
  </div>

const ProjectItem = ({ hive, projectKey, project}) => 
  <Card title={project.name}>
    { project.summary && <ProjectSummary summary={project.summary} /> }
    { !project.summary && project.price && <div> <ValueItem value={project.price} title={'Total $'} />
    </div> }
    <div className={"card-actions"}>
      <Link to={routes.PROJECT_EXECUTION_LIST.replace(':hive', hive).replace(':project', projectKey)}>Histórico</Link>
      <Link to={routes.PROJECT_EXECUTION_FORM.replace(':hive', hive).replace(':project', projectKey)}>Execução</Link>
    </div>
  </Card>

const ProjectList = ({ hive, projects }) =>
  <Row gutter={8}>
    {Object.keys(projects).map(projectKey =>
      <Col key={projectKey} md={{span: 8}} sm={{span: 12}} xs={{span: 24}} className={'projectItem'}>
        <ProjectItem hive={hive} projectKey={projectKey} project={projects[projectKey]} />
      </Col>
    )}
  </Row>

const HiveList = ({ hives }) =>
  <div>
    {Object.keys(hives).map(hiveKey =>
      <div key={hiveKey}>
        <h2>{hives[hiveKey].name}</h2>
        <div className={'projectList'}>
          <ProjectList hive={hiveKey} projects={hives[hiveKey].projects} />
        </div>
      </div>
    )}
  </div>

const mapStateToProps = (state) => { 
  return ({
    hives: state.hiveState.hives,
    authUser: state.sessionState.authUser,
  })
};

const mapDispatchToProps = (dispatch) => ({
  onSetHives: (hives) => dispatch({ type: 'HIVES_SET', hives }),
});

export default compose(
  connect(mapStateToProps, mapDispatchToProps)
)(HomePage);
