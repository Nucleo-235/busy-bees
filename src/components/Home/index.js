import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';

import withAuthorization from '../Session/withAuthorization';
import { db } from '../../firebase';

class HomePage extends Component {
  componentDidMount() {
    const { onSetHives } = this.props;

    db.onceGetHivesWithProjects().then(snapshot =>
      onSetHives(snapshot)
    );
  }

  render() {
    const { hives } = this.props;

    return (
      <div>
        <h1>Home</h1>
        <p>The Home Page is accessible by every signed in user.</p>

        { !!hives && <HiveList hives={hives} /> }
      </div>
    );
  }
}

const ProjectList = ({ projects }) =>
  <div>
    {Object.keys(projects).map(key =>
      <div key={key}>{projects[key].name}</div>
    )}
  </div>

const HiveList = ({ hives }) =>
  <div>
    <h2>List of Hives and Projects</h2>
    <p>(Saved on Firebase Database)</p>

    {Object.keys(hives).map(key =>
      <div key={key}>
        <span>{hives[key].name}</span>
        <div style={{ "paddingLeft": "10px" }}>
          <ProjectList projects={hives[key].projects} />
        </div>
      </div>
    )}
  </div>

const mapStateToProps = (state) => ({
  hives: state.hiveState.hives,
});

const mapDispatchToProps = (dispatch) => ({
  onSetHives: (hives) => dispatch({ type: 'HIVES_SET', hives }),
});

const authCondition = (authUser) => !!authUser;

export default compose(
  withAuthorization(authCondition),
  connect(mapStateToProps, mapDispatchToProps)
)(HomePage);
