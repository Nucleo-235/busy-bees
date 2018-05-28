const INITIAL_STATE = {
  hives: {},
};

const applySetHives = (state, action) => ({
  ...state,
  hives: action.hives
});

function userReducer(state = INITIAL_STATE, action) {
  switch(action.type) {
    case 'HIVES_SET' : {
      return applySetHives(state, action);
    }
    default : return state;
  }
}

export default userReducer;