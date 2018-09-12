import React, { Component } from 'react';

import { Link } from 'react-router-dom';
import { Card, Row, Col } from 'antd';
import * as routes from '../../constants/routes';

import './list.css';

export class ExecutionList extends Component {
  render() {
    const {
      executions,
      hive,
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
          {executions && executions.map(execution =>
            <Col key={execution.key} md={{span: 12, offset: 6}} sm={{span: 18, offset: 3}} xs={{span: 24}} className="item executionItem">
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
              </Card>
            </Col>
          )}
        </Row>
      </div>
    );
  }
}