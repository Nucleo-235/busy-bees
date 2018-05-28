import { combineReducers } from 'redux';
import sessionReducer from './session';
import hiveReducer from './hive';

const rootReducer = combineReducers({
  sessionState: sessionReducer,
  hiveState: hiveReducer,
});

export default rootReducer;
