const { app } = require('./src/app');

function printRawRoutes(app) {
  app._router.stack.forEach((layer, idx) => {
    if (layer.route) {
      console.log(`Layer ${idx}: ROUTE - ${layer.route.path}`);
    } else if (layer.name === 'router') {
      console.log(`Layer ${idx}: ROUTER - Regexp: ${layer.regexp.toString()}`);
      layer.handle.stack.forEach((h, hidx) => {
        if (h.route) {
          console.log(`  Handler ${hidx}: ROUTE - ${Object.keys(h.route.methods).join(', ').toUpperCase()} ${h.route.path}`);
        } else {
          console.log(`  Handler ${hidx}: MIDDLEWARE - ${h.name || 'anonymous'}`);
        }
      });
    } else {
      console.log(`Layer ${idx}: MIDDLEWARE - ${layer.name}`);
    }
  });
}

printRawRoutes(app);
