import React, { PureComponent, Fragment } from 'react';

export default class ListForm extends PureComponent {
  constructor(props) {
    super(props);
    this.state = { data: props.value };
  }
  componentWillReceiveProps(nextProps) {
    if ('value' in nextProps) {
      this.setState({
        data: nextProps.value,
      });
    }
  }
  
  add(newItem) {
    const currentData = this.state.data;
    let data = null;
    if (currentData) {
      data = [ ...currentData, newItem ];
    } else {
      data = [ newItem ];
    }
    this.setState({ ...this.state, data });
    this.props.onChange(data);
  }

  remove(item, idx) {
    const currentData = this.state.data;
    if (currentData) {
      const data = [ ...currentData ];
      data.splice(idx, 1);
      this.setState({ ...this.state, data });
      this.props.onChange(data);
    }
  }

  update(updatedItem, idx) {
    const currentData = this.state.data;
    if (currentData) {
      const data = [ ...currentData ];
      data[idx] = { ...updatedItem };
      this.setState({ ...this.state, data });
      this.props.onChange(data);
    }
  }

  render() {
    const { data } = this.state;

    const evAdd = (newItem) => this.add(newItem);
    const evRemove = (item, idx) => this.remove(item, idx);
    const evUpdate = (updatedItem, idx) => this.update(updatedItem, idx);
    
    return <Fragment>
      {this.props.renderHeader && this.props.renderHeader(evAdd, evRemove)}
      {data && this.props.renderNested && data.map((item, idx) => this.props.renderNested(item, idx, evUpdate, evRemove))}
      {this.props.renderFooter && this.props.renderFooter(evAdd, evRemove)}
    </Fragment>;
  }
}
