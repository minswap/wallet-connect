const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');

// Grab the version argument from the command line if provided
const specifiedVersion = process.argv[2];

// Define the path to the package.json file
const packagePath = path.join(__dirname, '..', 'packages', 'wc-dapp', 'package.json');

// Function to execute shell commands
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout ? stdout : stderr);
      }
    });
  });
}

// Function to execute shell commands synchronously
function executeCommandSync(command) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`An error occurred while executing a command: ${error}`);
  }
}

// Read and update the package.json file
fs.readFile(packagePath, 'utf8', async (err, data) => {
  if (err) {
    console.error('An error occurred while reading the package.json file:', err);
    return;
  }

  let packageObj;
  try {
    packageObj = JSON.parse(data);
  } catch (e) {
    console.error('An error occurred while parsing the package.json file:', e);
    return;
  }

  if (specifiedVersion) {
    packageObj.version = specifiedVersion;
  } else {
    if (!packageObj.version) {
      console.error('The package.json file does not contain a version field.');
      return;
    }

    const versionComponents = packageObj.version.split('.');
    if (versionComponents.length !== 3) {
      console.error('Invalid version format in package.json');
      return;
    }

    versionComponents[1] = parseInt(versionComponents[1], 10) + 1;
    packageObj.version = versionComponents.join('.');
  }

  fs.writeFile(packagePath, JSON.stringify(packageObj, null, 2), 'utf8', async err => {
    if (err) {
      console.error('An error occurred while writing the updated package.json file:', err);
      return;
    }

    console.info(`Successfully set version to ${packageObj.version}`);

    try {
      console.info('Build');
      await executeCommand('pnpm build --filter wc-dapp');

      console.info('Publish');
      executeCommandSync('pnpm publish --filter wc-dapp --no-git-checks');

      console.info('Commit new version');
      await executeCommand(`git add ${packagePath}`);
      await executeCommand(`git commit -m "chore: publish version v${packageObj.version}"`);

      console.info('Tag version');
      await executeCommand(`git tag v${packageObj.version}`);

      console.info('Push to remote');
      await executeCommand('git push origin main');
      await executeCommand(`git push origin v${packageObj.version}`);
    } catch (error) {
      console.error(`An error occurred while executing a command: ${error}`);
    }
  });
});
