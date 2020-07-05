(function() {
  const {
    component,
    requestRender,
    html,
    State,
  } = lensing;

  const button = component(
    // TOOD: get initial state func? or ctor since now we can
    // track mounts and dismounts with our lensing functions and state tree.
    function Button(props, state) {
      return html`<button>Num clicks: ${state.clickCount || 0}</button>`;
    },
    {
      '':  [
        'click',
        // TODO: allow arrow funcs by passing `this` as first arg
        function() {
          this.state.set({
            clickCount: (this.state.clickCount || 0) + 1,
          });
        },
      ],
    },
  );

  requestRender(
    {
      id: 'content',
      props: {},
      state: new State(),
    },
    component(
      function App(props, state) {
        return html`<div>Heyoo!<br />${button(null, state.lense('button'))}</div>`;
      },
      // add model getter.
      // model getters have to be stateless too then? :|
      // How does component local state work? Since they're pure functions...
      // Component local state in the relational local DB too?
      // And bound to that as the model?
    ),
  );
})();
