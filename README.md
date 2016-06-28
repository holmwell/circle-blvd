circle tasks
===============
Circle Tasks 1.5 is a task management tool, made for teams of 1-12 people. 

[![Build Status](https://travis-ci.org/holmwell/circle-tasks.svg?branch=master)](https://travis-ci.org/holmwell/circle-tasks)

Circle Tasks supports:
 * Multiple projects
 * Unlimited user accounts 
 * Task lists, assignments, status updates, comments
 * Drag-and-drop prioritization
 * One-line task entry, multiple-line entry
 * Email notifications
 * Reusable checklists
 * Roadmap planning
 * Archiving
 * Admin management
 * Payments from members, partners
 * HTTPS

This software is free, and it runs on Mac, Linux, and Windows. You can install it on your own computer, using instructions below as a guide, or you can create an account on [https://circletasks.com](https://circletasks.com), which is also free, supported by donations.

Circle Tasks is a web server. It is accessible on desktop computers, tablets, and phones (tested on Android and iOS devices).

Circle Tasks is perhaps best for clubs and boards of directors. It was initially created for the Corvallis Swing Dance Society, a volunteer organization that hosts 3-4 events each month, with a weekly board meeting.

A self-guided tour is at [https://circletasks.com/tour](https://circletasks.com/tour).


running on AWS
----------------
To get Circle Tasks up and running on an EC2 instance in about 20 minutes, 
as a daemon, please find a quickstart in [./deploy/amazon-ec2](https://github.com/holmwell/circle-tasks/tree/master/deploy/amazon-ec2). 


running for fun
----------------
If you can run Apache CouchDB on your system, you can run Circle Tasks. 

### Prerequisites
1. Node >= 0.10
2. CouchDB >= 1.3

### Installation
1. Install and start CouchDB
2. Do the standard command prompt things:

        git clone https://github.com/holmwell/circle-tasks.git
        cd circle-tasks/server/
        npm install --production
        npm start
  
3. Go to [http://localhost:3000](http://localhost:3000)

for developers
-----------------
If you're making the software or managing deployments, you
might like to know:

### Running for development

    npm run-script debug

This will turn off JavaScript minification / compression.

### Testing

    npm test

Uses `nodeunit` for now.

### Deployment
There is an assume-it-all-works deployment outline in [./deploy/git-hook](https://github.com/holmwell/circle-tasks/tree/master/deploy/git-hook).

### License
BSD, 2-clause. See the LICENSE.txt file for details. 

The privacy policy is under a [Creative Commons Sharealike](https://creativecommons.org/licenses/by-sa/2.5/) license.