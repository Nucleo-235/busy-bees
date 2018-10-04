import * as React from 'react';

import { Form, InputNumber, Input, Col } from 'antd';

export class PriorityRowFormComponent extends React.PureComponent {
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

  handleSubmit = e => {
    if (e && e.preventDefault)
      e.preventDefault();

    setTimeout(() => {
      this.props.form.validateFields((err, values) => {
        if (!err) {
          this.props.onChange(values);
        }
      });
    }, 0)
  };

  render() {
    const { data } = this.state;
    
    const { getFieldDecorator } = this.props.form;
    
    return (
      <React.Fragment>
        <Col md={20} sm={16}>
          {getFieldDecorator(`key`, { initialValue: data.key })(
            <Input placeholder="Ex: URGENTE" onChange={this.handleSubmit} />
          )}
        </Col>
        <Col md={4} sm={8}>
          {getFieldDecorator(`hour_price`, { initialValue: data.hour_price })(
            <InputNumber min={0} step={1} max={1000} placeholder="Ex: 10,00" onChange={this.handleSubmit} />
          )}
        </Col>
      </React.Fragment>
    );
  }
}

export default Form.create()(PriorityRowFormComponent);