const express = require('express');
const axios = require('axios');
require('dotenv').config()

const app = express();
app.use(express.json());

const isValid = (str) => str && str !== 'null'

const BRANCHES = {
  production: 'main',
  preview: 'dev/develop',
  dev: 'dev/develop',
}
app.post('/vercel-deploy-hook', async (req, res) => {
  const payload = req.body;
  console.log("Payload: ", payload)

  // Do nothing for storybook app
  if (payload.target.includes('storybook')) {
    res.status(200).send('Notification did not send!');
  }

  let text, message
  if (payload.status === 'success') {
    text = `*${payload.name}* was deployed successfully. You can test via this address: ` + process.env.DEPLOY_ADDRESS
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
              value: payload.target?.split(" ")[0]?.trim().toLowerCase(),
              short: true,
            } : null,
            isValid(payload.gitSource.ref) ? {
              title: 'Branch',
              value: BRANCHES[payload.gitSource.ref?.split(" ")[0]?.trim().toLowerCase()],
              short: true,
            } : null,
            isValid(payload.gitSource.message) ? {
              title: 'Commit Message',
              value: payload.gitSource.message,
              short: false,
            } : null,
          ].filter(item => !!item),
          footer: `Deployed at ${payload.createdAt ? new Date(payload.createdAt).toLocaleString() : new Date().toLocaleString()}`,
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
