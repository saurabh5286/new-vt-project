const { app } = require('./src/app');

// Find the router registered for chat (/api/v1/chat)
const chatRouterLayer = app._router.stack.find(layer => {
  if (layer.name === 'router') {
    return layer.regexp.toString().includes('chat');
  }
  return false;
});

if (chatRouterLayer) {
  console.log('Chat router Regexp:', chatRouterLayer.regexp.toString());
  console.log('Chat router handlers in order:');
  chatRouterLayer.handle.stack.forEach((layer, idx) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`  [${idx}] ROUTE: ${methods} ${layer.route.path}`);
    } else {
      console.log(`  [${idx}] MIDDLEWARE: ${layer.name || 'anonymous'}`);
    }
  });
} else {
  console.log('Chat router layer not found!');
  // print all router regexp to help identify
  app._router.stack.forEach((layer, idx) => {
    if (layer.name === 'router') {
      console.log(`  Layer [${idx}] Router: ${layer.regexp.toString()}`);
    }
  });
}
