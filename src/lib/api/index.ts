import { dockerApi } from "./docker";
import { keysApi, ptyApi } from "./pty";
import { profilesApi, snippetsApi } from "./profiles";
import { sftpApi } from "./sftp";
import { vaultApi } from "./vault";

/** Flat invoke surface kept for existing call sites. */
export const api = {
  vaultStatus: vaultApi.status,
  vaultUnlock: vaultApi.unlock,
  vaultLock: vaultApi.lock,
  vaultSetMasterPassword: vaultApi.setMasterPassword,
  vaultChangeMasterPassword: vaultApi.changeMasterPassword,
  vaultRemoveMasterPassword: vaultApi.removeMasterPassword,

  listProfiles: profilesApi.list,
  upsertProfile: profilesApi.upsert,
  deleteProfile: profilesApi.delete,
  duplicateProfile: profilesApi.duplicate,
  getSshCommand: profilesApi.getSshCommand,

  listSnippets: snippetsApi.list,
  upsertSnippet: snippetsApi.upsert,
  deleteSnippet: snippetsApi.delete,

  ptyCreate: ptyApi.create,
  ptyWrite: ptyApi.write,
  ptyResize: ptyApi.resize,
  ptyKill: ptyApi.kill,
  ptyInject: ptyApi.inject,

  openExternalSsh: keysApi.openExternalSsh,
  generateProfileKey: keysApi.generateProfileKey,
  installProfileKey: keysApi.installProfileKey,

  sftpOpen: sftpApi.open,
  sftpClose: sftpApi.close,
  sftpList: sftpApi.list,
  sftpMkdir: sftpApi.mkdir,
  sftpRename: sftpApi.rename,
  sftpRemove: sftpApi.remove,
  sftpRemoveBatch: sftpApi.removeBatch,
  sftpUpload: sftpApi.upload,
  sftpUploadBatch: sftpApi.uploadBatch,
  sftpDownload: sftpApi.download,
  sftpCopyRemote: sftpApi.copyRemote,
  sftpCopyBatch: sftpApi.copyBatch,
  sftpMoveBatch: sftpApi.moveBatch,
  sftpReadText: sftpApi.readText,
  sftpWriteText: sftpApi.writeText,

  dockerProbe: dockerApi.probe,
  dockerListContainers: dockerApi.listContainers,
  dockerContainerAction: dockerApi.containerAction,
  dockerListImages: dockerApi.listImages,
  dockerImageRemove: dockerApi.imageRemove,
  dockerListVolumes: dockerApi.listVolumes,
  dockerVolumeRemove: dockerApi.volumeRemove,
  dockerListNetworks: dockerApi.listNetworks,
  dockerNetworkRemove: dockerApi.networkRemove,
  dockerComposeRun: dockerApi.composeRun,
};

export { vaultApi, profilesApi, snippetsApi, ptyApi, keysApi, sftpApi, dockerApi };
