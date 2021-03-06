import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';

import { db } from '../../firebase';
import * as moment from 'moment';

import { Link } from 'react-router-dom';
import * as routes from '../../constants/routes';

import { Row, Col, Card, Progress, Button } from "antd";
import { mapToArray } from '../../utils/listUtils';

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

const ProgressItemFormatted = ({pct, title, format, status}) => {
  const percent = Math.round(pct*100);
  return <div className="progress">
    <div className="">
      <Progress type="circle" percent={percent} format={format} status={status} />
    </div>
    <div span={24} className="title">{title}</div>
  </div>
}
const ProgressItem = ({pct, title}) => {
  let format = percent => percent + '%';
  let status = null;
  if (pct >= 1) {
    format = () => <i className="anticon anticon-check"></i>;
    status = "success";
  }
  return <ProgressItemFormatted pct={pct} title={title} format={format} status={status} />
}
const ProgressItemInverse = ({pct, title}) => {
  const actualPercent = Math.round(pct*100);
  let format = percent => percent + '%';
  let status = null;
  if (pct === 1) {
    format = () => <i className="anticon anticon-check"></i>;
    status = "success";
  } else if (pct > 1) {
    format = () => actualPercent + '%';
    status = "exception"
  }
  return <ProgressItemFormatted pct={pct} title={title} format={format} status={status} />
}

const ValueItem = ({value, title}) =>
  <div className="value-item">
    <div className="value">
      {value}
    </div>
    <div span={24} className="title">{title}</div>
  </div>

const ProjectSummary = ({project, summary}) => {
  let deadlineInfo = "";
  let deadlineTitle = project.deadline || 'Prazo';
  if (project.startAtDateValue && project.deadlineDaysPeriod && project.deadlineDaysPeriod > 0) {
    if (project.finished) {
      if (project.doneAtDateValue && project.doneAtDateValue > project.deadlineDateValue) {
        const daysFromStart = moment(project.doneAtDateValue).diff(moment(project.startAtDateValue), 'days');
        const daysPct = daysFromStart / project.deadlineDaysPeriod;
        deadlineInfo = <ProgressItemInverse pct={daysPct} title={deadlineTitle} />
      } else {
        deadlineInfo = <ProgressItemInverse pct={1} title={deadlineTitle} />
      }
      
    } else {
      const daysFromStart = moment().diff(moment(project.startAtDateValue), 'days');
      const daysPct = daysFromStart / project.deadlineDaysPeriod;
      deadlineInfo = <ProgressItemInverse pct={daysPct} title={deadlineTitle} />
    }
  } 
  return <div>
    { deadlineInfo }
    { project.totalDifficulty && <ProgressItem pct={summary.difficultyProgress || 0} title={'Escopo'} /> }
    { project.price && <ProgressItemInverse pct={summary.spentProgress || 0} title={'Gasto $'} /> }
    { !project.totalDifficulty && <ValueItem value={summary.done.hours} title={'Gasto (h)'} /> }
    { !project.price && <ValueItem value={summary.done.spent} title={'Gasto $'} /> }
  </div>
}

const ProjectItem = ({ hive, projectKey, project}) => 
  <Card title={project.name}>
    { project.summary && <ProjectSummary project={project} summary={project.summary} /> }
    { !project.summary && project.price && <div> <ValueItem value={project.price} title={'Total $'} />
    </div> }
    <div className={"card-actions"}>
      <Link style={{float: "left"}} to={routes.EDIT_PROJECT_FORM.replace(':hive', hive).replace(':key', projectKey)}>Configurar</Link>
      <Link to={routes.PROJECT_EXECUTION_LIST.replace(':hive', hive).replace(':project', projectKey)}>Histórico</Link>
      <Link to={routes.PROJECT_EXECUTION_FORM.replace(':hive', hive).replace(':project', projectKey)}>Execução</Link>
    </div>
  </Card>

const groupProjectByType = (projectList, getGroupCallback) => {
  const groupMap = {};
  for (const project of projectList) {
    const group = getGroupCallback(project);
    if (group) {
      let existingGroup = groupMap[group.index];
      if (existingGroup) {
        existingGroup.projects.push(project);
      } else {
        groupMap[group.index] = group;
        group.projects.push(project);
      }
    }
  }

  return Object.keys(groupMap).sort().map(groupIndex => groupMap[groupIndex]);
}

const ProjectList = ({ hive, projects }) => {
  const projectGroups = groupProjectByType(projects, project => {
    if (project.finished && !project.deadline)
      return null;

    const group = { projects: [] };
    group.index = project.finished ? 2 : 0;
    group.hidden = project.finished;
    group.allowHide = project.finished;
    group.name = project.finished ? 'Finalizados' : 'Em Aberto';
    group.name += project.deadline ? ' - com Prazo' : ' - sem Prazo';
    group.sortingCB = (a, b) => (a.deadlineDateValue || 0) - (b.deadlineDateValue || 0);
    if (!project.deadline) {
      group.index += 1;
      group.sortingCB = (a, b) => a.name - b.name;
    }
    
    return group;
  });

  const toggleHidden = (project => {
    project.hidden = !project.hidden;
  })
  
  return <div>
    {projectGroups.map(groupProject =>
      <div key={groupProject.name}>
        {groupProject.allowHide
          ? (<h3>{groupProject.name} - <Button onClick={() => toggleHidden(groupProject)}>{groupProject.hidden ? 'Mostrar' : 'Esconder'}</Button></h3>)
          : (<h3>{groupProject.name}</h3>)}
        {!groupProject.hidden && <Row gutter={8}>
          {groupProject.projects.sort(groupProject.sortingCB).map(project =>
            <Col key={project.key} md={{span: 8}} sm={{span: 12}} xs={{span: 24}} className={'projectItem'}>
              <ProjectItem hive={hive} projectKey={project.key} project={project} />
            </Col>
          )}
        </Row>}
      </div>
    )}</div>
}

const HiveList = ({ hives }) =>
  <div>
    {Object.keys(hives).map(hiveKey =>
      <div key={hiveKey}>
        <h2>{hives[hiveKey].name}</h2>
        <div className={'projectList'}>
          <ProjectList hive={hiveKey} projects={mapToArray(hives[hiveKey].projects)} />
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
