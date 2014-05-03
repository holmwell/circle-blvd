circle blvd.
===============
Manage projects. 

Good for teams of 3-10 people with one project, like a small business
or volunteer organization.


running on AWS
----------------
To get Circle Blvd up and running on an EC2 instance in about 20 minutes, 
as a daemon, please find a quickstart here: 
[https://gist.github.com/exclsr/6cd72c7815e0ea1ab74e][1].


running for fun
----------------
If you can run CouchDB on your system, you can run Circle Blvd. 

### Prerequisites
1. Node >= 0.8
2. CouchDB >= 1.0

### Installation
* `(start CouchDB)`
* `git clone https://github.com/secret-project/circle-blvd.git`
* `cd circle-blvd/app/`
* `npm install --production`
* `node server.js`
* `Go to http://localhost:3000`

for developers
-----------------
If you're making the software or managing deployments, you
might like to know:

### Testing
* Uses `karma` and `jasmine` for now.
* `scripts/test.sh`

### Deployment
There is an assume-it-all-works deployment outline here: [https://gist.github.com/exclsr/ab5b674d6d15b335d60f][2]

### License
BSD, 2-clause. See the LICENSE.txt file for details.

[1]: https://gist.github.com/exclsr/6cd72c7815e0ea1ab74e "Running"
[2]: https://gist.github.com/exclsr/ab5b674d6d15b335d60f "Deploy"