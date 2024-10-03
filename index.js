const express = require('express');
const axios = require('axios');
require('dotenv').config()

const app = express();
app.use(express.json());

app.post('/vercel-deploy-hook', async (req, res) => {
  const payload = req.body;
  console.log("Payload: ", payload)

  // Do nothing for another status
  if (payload.status !== 'success' || payload.status !== 'failure') {
    return
  }
  const text = payload.status === 'success' ? `*${payload.name}* was deployed successfully. You can test via this address: ` + process.env.DEPLOY_ADDRESS : `*${payload.name}* was deployed fail. Please double-check the build log.`
  const message = {
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
          {
            title: 'Environment',
            value: payload.target,
            short: true,
          },
          {
            title: 'Branch',
            value: payload.gitSource.ref,
            short: true,
          },
          {
            title: 'Commit Message',
            value: payload.gitSource.message,
            short: false,
          },
        ],
        footer: `Deployed at ${new Date(payload.createdAt).toLocaleString()}`,
      },
    ],
  };

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
