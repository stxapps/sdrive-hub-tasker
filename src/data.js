import { Datastore } from '@google-cloud/datastore';
import { Storage } from '@google-cloud/storage';

import { FILE_LOG } from './const';

const datastore = new Datastore();
const storage = new Storage();

const backupFile = async (logKey, path) => {
  try {
    const bucketFile = storage.bucket('sdrive-001.appspot.com').file(path);
    const backupBucket = storage.bucket('sdrive-hub-backup')
    await bucketFile.copy(backupBucket, { predefinedAcl: 'private' });
  } catch (error) {
    // Just log. Need to manually copy directly from Storage.
    // This can retry at the task level, but saveFileLog cannot.
    console.error(`(${logKey}) Error performBackup: ${path}`, error);
  }
};

const backupFiles = async (logKey, paths) => {
  const nItems = 10;
  for (let i = 0; i < paths.length; i += nItems) {
    const selectedPaths = paths.slice(i, i + nItems);
    await Promise.all(selectedPaths.map(path => backupFile(logKey, path)));
  }
};

const saveFileLog = async (logKey, fileLog) => {
  const { path, action, size, sizeChange } = fileLog;

  let assoIssAddress = fileLog.assoIssAddress;
  if (!assoIssAddress) assoIssAddress = 'n/a';

  const logData = [
    { name: 'path', value: path, excludeFromIndexes: true },
    { name: 'assoIssAddress', value: assoIssAddress, excludeFromIndexes: true },
    { name: 'action', value: action, excludeFromIndexes: true },
    { name: 'size', value: size, excludeFromIndexes: true },
    { name: 'sizeChange', value: sizeChange, excludeFromIndexes: true },
    { name: 'createDate', value: new Date() },
  ];

  try {
    await datastore.save({ key: datastore.key([FILE_LOG]), data: logData });
  } catch (error) {
    // Just log. Can't just retry on the task, some might succeed, some might fail.
    // Bucket size will be wrong, need to recal direclty from Storage.
    console.error(`(${logKey}) Error saveFileLog: ${path}`, error);
  }
};

const saveFileLogs = async (logKey, fileLogs) => {
  // Order is important,
  //   but it's unlikely to have same path with multiple fileLogs in the same request.
  const nItems = 10;
  for (let i = 0; i < fileLogs.length; i += nItems) {
    const selectedFileLogs = fileLogs.slice(i, i + nItems);
    await Promise.all(selectedFileLogs.map(fileLog => saveFileLog(logKey, fileLog)));
  }
};

const data = { backupFiles, saveFileLogs };

export default data;
