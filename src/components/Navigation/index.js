import React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';

import SignOutButton from '../SignOut';
import * as routes from '../../constants/routes';

import './index.css';

const Navigation = ({ authUser, className }) =>
  <div className={className}>
    { authUser
        ? <NavigationAuth />
        : <NavigationNonAuth />
    }
  </div>

const NavigationAuth = () =>
  <ul>
    <li><Link to={routes.HOME}>Home</Link></li>
    {/* <li><Link to={routes.EXECUTION_LIST}>Histórico</Link></li> */}
    <li><Link to={routes.EXECUTION_CALENDAR}>Calendário</Link></li>
    <li><Link to={routes.NEW_PROJECT_FORM}>Novo Projeto</Link></li>
    <li><Link to={routes.ACCOUNT}>Account</Link></li>
    <li><SignOutButton /></li>
  </ul>

const NavigationNonAuth = () =>
  <ul>
    <li><Link to={routes.HOME}>Home</Link></li>
    <li><Link to={routes.SIGN_IN}>Sign In</Link></li>
  </ul>

const mapStateToProps = (state) => ({
  authUser: state.sessionState.authUser,
});

export default connect(mapStateToProps)(Navigation);
