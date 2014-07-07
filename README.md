circle blvd.
===============
For groups of people to get on the same page, Circle Blvd is for managing tasks, keeping track of progress, and knowing who is doing what in your group projects. The suggested group size is 3-10 people, but there is no practical limit to the number of accounts.

This software is free, and it runs on Mac, Linux, and Windows. You can install it on your own computer, using instructions below as a guide, or you can create an account on [https://circleblvd.org](https://circleblvd.org), which is also free, supported by donations of happy members.

Documentation is at [https://circleblvd.org/#/docs](https://circleblvd.org/#/docs). Have fun! 


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
1. Install and start CouchDB
2. Do the standard command prompt things:

        git clone https://github.com/secret-project/circle-blvd.git
        cd circle-blvd/app/
        npm install --production
        node server.js
  
3. Go to [http://localhost:3000](http://localhost:3000)

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