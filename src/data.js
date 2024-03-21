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
  const { path, action, size, sizeChange, createDT } = fileLog;

  let assoIssAddress = fileLog.assoIssAddress;
  if (!assoIssAddress) assoIssAddress = 'n/a';

  // Cannot use auto-generated id as cloud task might rerun/retry.
  // Do not use monotonically increasing values
  // Do not use a forward slash
  // Ref: cloud.google.com/datastore/docs/cloud-datastore-best-practices
  const key = datastore.key([FILE_LOG, `${path}?createDT=${createDT}`]);
  const data = [
    { name: 'path', value: path, excludeFromIndexes: true },
    { name: 'assoIssAddress', value: assoIssAddress, excludeFromIndexes: true },
    { name: 'action', value: action, excludeFromIndexes: true },
    { name: 'size', value: size, excludeFromIndexes: true },
    { name: 'sizeChange', value: sizeChange, excludeFromIndexes: true },
    { name: 'createDate', value: new Date(createDT) },
  ];

  try {
    await datastore.save({ key, data });
  } catch (error) {
    console.error(`(${logKey}) Error saveFileLog: ${path}`, error);
  }
};

const saveFileLogs = async (logKey, fileLogs) => {
  const nItems = 10;
  for (let i = 0; i < fileLogs.length; i += nItems) {
    const selectedFileLogs = fileLogs.slice(i, i + nItems);
    await Promise.all(selectedFileLogs.map(fileLog => saveFileLog(logKey, fileLog)));
  }
};

const data = { backupFiles, saveFileLogs };

export default data;
