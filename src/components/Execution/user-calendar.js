import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';
import { Link, withRouter } from 'react-router-dom';

import * as moment from 'moment';

import { db } from '../../firebase';
import withAuthorization from '../Session/withAuthorization';
import * as routes from '../../constants/routes';

import { Calendar, Modal } from 'antd';
import { mapToArray } from '../../utils/listUtils';

import './user-calendar.css';

const DefaultDateDBFormat = "YYYY-MM-DD";

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
    const startValue = moment().utc().startOf('day').valueOf();
    const endValue = moment().utc().endOf('day').valueOf();
    const isPlanned = (execution) => execution.dateValue > endValue || (execution.dateValue >= startValue && execution.planned);
    for (const execution of executions) {
      let item = map[execution.project];
      if (item) {
        item.hours = (item.hours || 0) + execution.hours || 0;
        item.difficulty = (item.difficulty || 0) + execution.difficulty || 0;
        item.children.push(execution);
      } else {
        item = Object.assign({ }, execution, { children: [execution], plannedChildren: [], doneChildren:[] });
        map[item.project] = item;
        list.push(item);
      }
      if (isPlanned(execution)) {
        item.plannedChildren.push(execution);
        item.plannedHours = (item.plannedHours || 0) + execution.hours || 0;
        item.plannedDifficulty = (item.plannedDifficulty || 0) + execution.difficulty || 0;
      } else {
        item.doneChildren.push(execution);
        item.doneHours = (item.doneHours || 0) + execution.hours || 0;
        item.doneDifficulty = (item.doneDifficulty || 0) + execution.difficulty || 0;
      }
    }
    return list;
  }

  filterData(executions, start, end) {
    return executions.filter(item => item.dateValue >= start && item.dateValue <= end);
  }

  dateCellRender(value) {
    const { executions } = this.state;
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
              <span>({item.hours}) {item.projectName || item.project}</span>
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
    const total = listData.reduce((x, y) => x + (y.hours || 0), 0)
    this.setState(() => ({ ...{ 
      selectedDate: value, 
      selectedList: listData, 
      selectedTotal: total, 
      detailsVisible: true 
    } })); 
  }

  renderDetailsList(label, total, items, property, hoursProperty, totalClass = "totals") {
    return <ul className="calendar-modal">
      <li className={totalClass}><strong>{label}: {total}</strong></li>
      { items.map(item => 
      <li key={item.key} className="item">
        <div>
          <h4 style={{ marginBottom: "2px" }}>({item[hoursProperty]}) {item.projectName || item.project}</h4>
          <ul>
          {item[property].map(execution => (
            <li className="subItem" key={"c" + execution.key} tooltip={execution.key}>
              <Link to={routes.EDIT_EXECUTION_FORM.replace(':hive', item.hive).replace(':key', execution.key)}>
                ({execution.hours}) {execution.description || '-'}
              </Link>
            </li>))}
          </ul>
        </div>
      </li>
      )}
    </ul>
  }

  renderDetails(date, listData, total) {
    const items = listData || [];
    const plannedItems = items.filter(i => i.plannedHours > 0);
    const doneItems = items.filter(i => i.doneHours > 0);
    const plannedTotal = items.reduce((x, y) => x + (y.plannedHours || 0), 0);
    const dayFormPath = `${routes.EMPTY_EXECUTION_FORM}?date=${date.utc().format(DefaultDateDBFormat)}`;

    let baseDetails = null;
    if (plannedTotal > 0 && total > plannedTotal) {
      baseDetails = <div>
        {this.renderDetailsList("Total", total, [], 'children', 'hours', "totals")}
        {this.renderDetailsList(<i>Planejadas</i>, plannedTotal, plannedItems, 'plannedChildren', 'plannedHours', "subtotals")}
        {this.renderDetailsList("Executadas", total - plannedTotal, doneItems, 'doneChildren', 'doneHours', "subtotals")}
      </div>
    } else {
      baseDetails = this.renderDetailsList("Total", total, items, 'children', 'hours', "totals")
    }

    return <div>
      {baseDetails}
      <div className={"day-actions"} style={{ marginTop: "15px" }}>
        <Link to={dayFormPath} >Nova Execução</Link>
      </div>
    </div>
  }

  render() {
    const { executions, 
      selectedDate, selectedList, selectedTotal, detailsVisible } = this.state;

    const closeModal = () =>  { 
      this.setState({ ...{ detailsVisible: false } });
    }

    return (
      <div style={{ textAlign: "center", width: "100%" }}>
        <h3>Meu Calendário</h3>
        {executions && 
          <Calendar 
            dateCellRender={value => this.dateCellRender(value)} 
            monthCellRender={value => this.monthCellRender(value)}
            onPanelChange={(value, mode) => this.calendarPanelChange(value, mode)} 
            onSelect={(value => this.dateSelected(value))} />}
        { selectedDate && <Modal
          visible={detailsVisible} footer={null}
          onCancel={closeModal}
          title={selectedDate.format('YYYY-MM-DD')}>
          {this.renderDetails(selectedDate, selectedList, selectedTotal)}
        </Modal>}
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