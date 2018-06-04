import React, { Component } from 'react';

import { Card, Row, Col } from 'antd';

import './list.css';

export class ExecutionList extends Component {
  render() {
    const {
      executions,
      showProject
    } = this.props;

    return (
      <div className="list executions-list">
        <Row gutter={8}>
          {executions && executions.map(execution =>
            <Col key={execution.key} md={{span: 12, offset: 6}} sm={{span: 18, offset: 3}} xs={{span: 24}} className="item executionItem">
              <Card title={<div>
                  <span className="left">{showProject ? execution.project : execution.participant}</span>
                  <span className="right">{execution.date}</span>
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