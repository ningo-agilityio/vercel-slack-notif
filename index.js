const express = require('express');
const axios = require('axios');
require('dotenv').config()

const app = express();
app.use(express.json());

const isValid = (str) => str && str !== 'null'

const extractBranchName = (commitMessage) => {
  const regex = /into '([a-zA-Z0-9-_\/]+)'/; // Regex to match the branch name after "into"
  const match = commitMessage.match(regex);
  const validBranches = ['main', 'master', 'dev', 'develop']
  return match && validBranches.indexOf(match[1]) > -1 ? match[1] : null; // Return the captured branch name or null if not found
}

const BRANCHES = {
  production: 'main',
  preview: 'dev/develop',
  dev: 'dev/develop',
}

const ENVIRONMENTS = {
  main: 'production',
  master: 'production',
  dev: 'development',
  develop: 'development',
}
const NOT_SEND_NOTIF_APP = ['storybook', 'medical-dashboard-storybook']
app.post('/vercel-deploy-hook', async (req, res) => {
  const payload = req.body;
  console.log("Payload: ", payload)

  // Do nothing for storybook app
  // Medical: Production – medical-dashboard-storybook
  if (!!NOT_SEND_NOTIF_APP.find(item => payload.target.includes(item)) || !payload.status || payload.status === 'null') {
    res.status(200).send('Notification did not send!');
  }

  let text, message
  if (payload.status === 'success') {
    text = `*${payload.name}* was deployed successfully. You can test via this address: ` + process.env.DEPLOY_ADDRESS
    /**
     * "Merge branch 'feat/create-event-form-modal-component' into 'develop'"
     */
    const commitMessage = isValid(payload.gitSource.message) ? payload.gitSource.message : '';
    const branchName = extractBranchName(commitMessage);

    console.log('branchName:', branchName);
    message = {
      text,
      attachments: [
        {
          title: 'Deployment Information',
          fields: [
            {
              title: 'Project',
              value: payload.name,
              short: true,
            },
            isValid(payload.target) ? {
              title: 'Environment',
              value: branchName ? ENVIRONMENTS[branchName] : payload.target?.split(" ")[0]?.trim().toLowerCase(),
              short: true,
            } : null,
            isValid(payload.gitSource.ref) ? {
              title: 'Branch',
              value: branchName ?? BRANCHES[payload.gitSource.ref?.split(" ")[0]?.trim().toLowerCase()],
              short: true,
            } : null,
            isValid(payload.gitSource.message) ? {
              title: 'Commit Message',
              value: commitMessage,
              short: false,
            } : null,
          ].filter(item => !!item),
          footer: `Deployed at ${isValid(payload.createdAt) ? new Date(payload.createdAt).toLocaleString() : new Date().toLocaleString()}`,
        },
      ],
    };
  } else {
    text  = `*${payload.name}* was deployed fail. Please double-check the build log.`
    message = {
      text,
      attachments: [
        {
          title: 'Deployment Information',
          fields: [
            {
              title: 'Project',
              value: payload.name,
              short: true,
            },
          ]
        }
      ]
    }
  }
  

  try {
    await axios.post(process.env.SLACK_WEBHOOK, message);
    res.status(200).send('Notification sent successfully!');
  } catch (error) {
    console.error('Error sending Slack message', error);
    res.status(500).send('Failed to send notification');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
