## circle-blvd front-end

The "front end" of the Circle Blvd server is
basically an HTML / web client.

The `views` folder contains server-side templates.
We use the Jade template engine, powered by Express. 
The main view is `index.jade`.

The `public` folder is served as-is to our guests 
and members. It contains an AngularJS (1.3) app, 
along with stylesheets and some images.

Note, images of unusual size (IOUS) are in separate repos.