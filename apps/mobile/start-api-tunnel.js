const ngrok = require('@ngrok/ngrok');

async function start() {
  try {
    const listener = await ngrok.forward({
      addr: 3001,
      authtoken: '2RCbvGpGI0tkMGosDgykOYUoL5y_2h5Udr1ngyFWo7ydPoYHk',
    });
    console.log('NGROK_API_URL=' + listener.url());
    setInterval(() => {}, 60000);
  } catch (err) {
    console.error('Failed to start ngrok tunnel:', err);
    process.exit(1);
  }
}

start();
