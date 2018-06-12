import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { withRouter, Link } from 'react-router-dom';

import * as moment from 'moment';

import { db } from '../../firebase';
import withAuthorization from '../Session/withAuthorization';
import * as routes from '../../constants/routes';

import { Calendar, Popover } from 'antd';
import { mapToArray } from '../../utils/listUtils';

import './user-calendar.css';

const INITIAL_STATE = {
  executions: null,
};

class UserExecutionCalendarPage extends Component {
  constructor(props) {
    super(props);
    this.state = { ...INITIAL_STATE };
  }

  componentDidMount() {
    const start = moment().utc().startOf('month').valueOf();
    const end = moment().utc().endOf('month').valueOf() + 1;

    db.onceGetUserExecutionsMap({ start, end}).then(executions => {
      this.setState(() => ({ ...{
        executions: mapToArray(executions).sort((a, b) => (b.dateValue || 0) - (a.dateValue || 0))
      } }));
    });
  }

  summarizeProjectData(executions) {
    var map = {};
    var list = [];
    for (const execution of executions) {
      if (map[execution.project]) {
        const item = map[execution.project];
        item.hours = (item.hours || 0) + execution.hours || 0;
        item.difficulty = (item.difficulty || 0) + execution.difficulty || 0;
        item.children.push(execution);
      } else {
        const item = Object.assign({ }, execution, { children: [execution] });
        map[item.project] = item;
        list.push(item);
      }
    }
    return list;
  }

  filterData(executions, start, end) {
    return executions.filter(item => item.dateValue >= start && item.dateValue <= end);
  }

  dateCellRender(value) {
    const { executions, } = this.state;
    const start = value.utc().startOf('day').valueOf();
    const end = value.utc().endOf('day').valueOf();
    const listData = this.summarizeProjectData(this.filterData(executions, start, end));
    const total = listData.reduce((x, y) => x + (y.hours || 0), 0)
    return (
      <ul className="calendar-day">
        { total > 0 && <li className="totals"><strong>Total: {total}</strong></li> }
        {
          listData.map(item => (
            <li key={item.key} className="item">
              <Popover content={this.renderDetails(value, listData, total)} title={value.format('YYYY-MM-DD')} trigger="click">
                <span>({item.hours}) {item.projectName || item.project}</span>
              </Popover>
            </li>
          ))
        }
      </ul>
    );
  }
  
  getMonthData(value) {
    const { executions, } = this.state;
    const start = value.utc().startOf('month').valueOf();
    const end = value.utc().endOf('month').valueOf();
    return this.filterData(executions, start, end).reduce((x, y) => x + (y.hours || 0), 0);
  }
  
  monthCellRender(value) {
    const num = this.getMonthData(value);
    return num > 0 ? (
      <div className="notes-month">
        <section>{num}</section>
        <span>Horas</span>
      </div>
    ) : null;
  }

  calendarPanelChange(date, mode) {
    const start = date.utc().startOf(mode).valueOf();
    const end = date.utc().endOf(mode).valueOf() + 1;
    db.onceGetUserExecutionsMap({start, end}).then(executions => {
      this.setState(() => ({ ...{
        executions: mapToArray(executions).sort((a, b) => (b.dateValue || 0) - (a.dateValue || 0))
      } }));
    });
  }

  dateSelected(value) {
    const { executions, } = this.state;
    const start = value.utc().startOf('day').valueOf();
    const end = value.utc().endOf('day').valueOf();
    const listData = this.summarizeProjectData(this.filterData(executions, start, end));
    this.setState(() => ({ ...{
      selectedDate: value,
      selectedList: listData,
      detailsVisible: true
    } }));
  }

  renderDetails(date, listData, total) {
    return <ul className="calendar-modal">
      { total > 0 && <li className="totals"><strong>Total: {total}</strong></li> }
      { listData && listData.map(item => (
          <li key={item.key} className="item">
            <div>
              <h4 style={{ marginBottom: "2px" }}>({item.hours}) {item.projectName || item.project}</h4>
              <ul>
              {item.children.map(execution => (
                <li className="subItem" key={"c" + execution.key} tooltip={execution.key}>
                  <p>({execution.hours}) {execution.description || '-'}</p>
                </li>))}
              </ul>
              <div className={"card-actions"} style={{ marginTop: "0px" }}>
                <Link to={routes.PROJECT_EXECUTION_LIST.replace(':hive', item.hive).replace(':project', item.project)}>Histórico</Link>
                <Link to={routes.PROJECT_EXECUTION_FORM.replace(':hive', item.hive).replace(':project', item.project)}>Execução</Link>
              </div>
            </div>
          </li>
        ))
      }
    </ul>
  }

  render() {
    const { executions } = this.state;

    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        <h3>Meu Calendário</h3>
        {executions && 
          <Calendar 
            dateCellRender={value => this.dateCellRender(value)} 
            monthCellRender={value => this.monthCellRender(value)}
            onPanelChange={(value, mode) => this.calendarPanelChange(value, mode)} 
            onSelect={(value => this.dateSelected(value))} />}
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
)(withRouter(UserExecutionCalendarPage));