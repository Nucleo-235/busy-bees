import React from 'react';
import {
  BrowserRouter as Router,
  Route,
} from 'react-router-dom';

import Navigation from '../Navigation';
import SignUpPage from '../SignUp';
import SignInPage from '../SignIn';
import PasswordForgetPage from '../PasswordForget';
import HomePage from '../Home';
import AccountPage from '../Account';
import withAuthentication from '../Session/withAuthentication';
import * as routes from '../../constants/routes';

import { Layout } from "antd";

import './index.css';

const { Header, Footer, Content } = Layout;

const App = () =>
  <Router>
    <Layout className="App">
      <Header className="App-header">
        <h1>Busy Bees</h1>
      </Header>
      <Content className="App-content">
        <Navigation />

        <Route exact path={routes.HOME} component={() => <HomePage />} />
        <Route exact path={routes.SIGN_UP} component={() => <SignUpPage />} />
        <Route exact path={routes.SIGN_IN} component={() => <SignInPage />} />
        <Route exact path={routes.PASSWORD_FORGET} component={() => <PasswordForgetPage />} />
        <Route exact path={routes.ACCOUNT} component={() => <AccountPage />} />
      </Content>
      <Footer className="App-footer">&copy; Busy Bees</Footer>
    </Layout>
  </Router>

export default withAuthentication(App);