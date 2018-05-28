import React, { Component } from 'react';
import { connect } from 'react-redux';
import { compose } from 'recompose';

import { db } from '../../firebase';

class HomePage extends Component {
  componentDidUpdate() {
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

const ProjectList = ({ projects }) =>
  <div>
    {Object.keys(projects).map(key =>
      <div key={key}>{projects[key].name}</div>
    )}
  </div>

const HiveList = ({ hives }) =>
  <div>
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
  authUser: state.sessionState.authUser,
});

const mapDispatchToProps = (dispatch) => ({
  onSetHives: (hives) => dispatch({ type: 'HIVES_SET', hives }),
});

export default compose(
  connect(mapStateToProps, mapDispatchToProps)
)(HomePage);
