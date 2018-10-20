import React, { Component } from 'react';

import { Link } from 'react-router-dom';
import { Card, Row, Col } from 'antd';
import * as routes from '../../constants/routes';

import { Execution } from '../../shared-lib/models/execution';
import { listToModelList } from '../../shared-lib/utils/model-utils';

import './list.css';

export class ExecutionList extends Component {
  renderExecution(execution, hive, project, prioritiesMap, participantsMap, showSpent, showEarned, showProject) {
    const actualParticipant = participantsMap[execution.participant];
    return (<Col key={execution.key} md={{span: 12, offset: 6}} sm={{span: 18, offset: 3}} xs={{span: 24}} className="item executionItem">
      <Card extra={<Link to={routes.EDIT_EXECUTION_FORM.replace(':hive', execution.hive || hive).replace(':key', execution.key)}>Abrir</Link>} title={<div>
          <span className="left">{showProject ? execution.project : execution.participant}</span>
          <span className="left">- {execution.date}</span>
        </div>}>
        {execution.description && <p>{execution.description}</p>}
        <div className="side-info">
          <div>
            <span>Horas:</span>
            <span>{execution.hours}</span>
          </div>
          { execution.difficulty && <div>
            <span>Dificuldade:</span>
            <span>{execution.difficulty}</span>
            </div>
          }
        </div>
        { project && prioritiesMap && (showEarned || showSpent) && <div className="side-info" style={{ width: "100%"}}>
          { showSpent && <div style={{display: "inline-block"}}>
            <span>Gasto:</span>
            <span>{execution.getSpentPrice(actualParticipant, project)}</span>
            </div>
          }
          { showSpent && <div style={{display: "inline-block"}}>
            <span>Ganho:</span>
            <span>{execution.getEarnPrice(actualParticipant, project, prioritiesMap)}</span>
            </div>
          }
        </div>}
      </Card>
    </Col>)
  }

  render() {
    const {
      executions,
      hive,
      project,
      prioritiesMap,
      participantsMap,
      showSpent,
      showEarned,
      showProject
    } = this.props;

    // const toReportList = (<div>
    //   {executions && executions.map(execution => 
    //   <div>
    //     {/* {execution.date} - {execution.description} => {execution.hours} ===> {execution.participant} */}
    //     {execution.date} - {execution.description} => {execution.hours}
    //   </div>
    // )}</div>)
    const toReportList = null;

    return (
      <div className="list executions-list">
        
        <Row gutter={8}>
          {toReportList}
          {executions && listToModelList(executions, Execution).map(execution => this.renderExecution(execution, hive,
            project, prioritiesMap, participantsMap,
            showSpent, showEarned, showProject))}
        </Row>
      </div>
    );
  }
}