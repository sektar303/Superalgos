exports.newOpenStorageUtilitiesAWSS3Storage = function newOpenStorageUtilitiesAWSS3Storage() {

    let thisObject = {
        saveFile: saveFile,
        loadFile: loadFile,
        removeFile: removeFile
    }

    return thisObject

    async function saveFile(fileName, filePath, fileContent, storageContainer) {
        /**@type {ApiSecret} */
        const secret = SA.secrets.apisSecrets.map.get(storageContainer.config.codeName)
        if (secret === undefined) {
            SA.logger.warn('You need at the Apis Secrets File a record for the codeName = ' + storageContainer.config.codeName)
            return
        }

        const s3Client = setupClient(secret, storageContainer)
        const { PutObjectCommand } = SA.nodeModules.awsS3
        let key = filePath + '/' + fileName + '.json'
        if(storageContainer.config.pathPrefix !== undefined && storageContainer.config.pathPrefix.length > 0) {
            let prefix = storageContainer.config.pathPrefix
            if(prefix.endsWith('/')) {
                key = prefix + key
            }
            else {
                key = prefix + '/' + key
            }
        } 
        await s3Client.send(new PutObjectCommand({
            bucket: storageContainer.config.bucketName,
            key,
            body: new Buffer.from(fileContent, 'utf-8').toString('base64'),
        })).then(() => {
            SA.logger.info('File just created on AWS S3. completePath = ' + key)
        })
    }

    async function loadFile(fileName, filePath, storageContainer) {

        const completePath = filePath + '/' + fileName + '.json'
        let endpoint = storageContainer.config.endpointUrl
        if(!endpoint.endsWith('/')) {
            endpoint += '/'
        }
        const URL = endpoint + completePath
        const axios = SA.nodeModules.axios
        return axios.get(URL)
            .then(res => {
                //SA.logger.info(`statusCode: ${res.status}`)
                return res.data
            })
            .catch(error => {
                SA.logger.error('Github Storage -> Load File -> Error = ' + error)
                SA.logger.error('Github Storage -> Load File -> completePath = ' + completePath)
                SA.logger.error('Github Storage -> Load File -> repo = ' + repo)
                SA.logger.error('Github Storage -> Load File -> owner = ' + owner)
                SA.logger.error('Github Storage -> Load File -> branch = ' + branch)
                SA.logger.error('Github Storage -> Load File -> URL = ' + URL)
            })
    }

    async function removeFile(fileName, filePath, storageContainer) {       
        /**@type {ApiSecret} */
        const secret = SA.secrets.apisSecrets.map.get(storageContainer.config.codeName);
        if (secret === undefined) {
            SA.logger.warn('Secret is undefined');
            SA.logger.warn(`You need to have a record for codeName = ${storageContainer.config.codeName} in the Apis Secrets File.`);
            return;
        }

        const s3Client = setupClient(secret, storageContainer)
        const { DeleteObjectCommand } = SA.nodeModules.awsS3
        let key = filePath + '/' + fileName + '.json'
        if(storageContainer.config.pathPrefix !== undefined && storageContainer.config.pathPrefix.length > 0) {
            let prefix = storageContainer.config.pathPrefix
            if(prefix.endsWith('/')) {
                key = prefix + key
            }
            else {
                key = prefix + '/' + key
            }
        }
        try {
            await s3Client.send(new DeleteObjectCommand({
                bucket: storageContainer.config.bucketName,
                key
            })).then(() => {
                SA.logger.info('File deleted on AWS S3. completePath = ' + key)
            })
        } catch (error) {
            SA.logger.error('Error:', error);
            SA.logger.error(`File could not be deleted from AWS S3 -> err.stack = ${error.stack}`);
        }
    }

    /**
     * 
     * @param {ApiSecret} secret 
     * @param {StorageContainer} storageContainer 
     * @returns {import { S3Client } from "@aws-sdk/client-s3";}
     */
    function setupClient(secret, storageContainer) {
        const options = {};
        if(secret.accessKeyId && secret.secretAccessKey) {
            options.accessKeyId = secret.accessKeyId
            options.secretAccessKey = secret.secretAccessKey
        }
        if(secret.region) {
            options.region = secret.region
        }
        if(storageContainer.config.bucketRegion !== undefined && storageContainer.config.bucketRegion.length > 0) {
            options.region = storageContainer.config.bucketRegion
        }
        const { S3Client } = SA.nodeModules.awsS3
        return new S3Client(options);
    }
}

/**
 * @typedef StorageContainer
 * @property {StorageContainerConfig} config
 */

/**
 * @typedef StorageContainerConfig
 * @property {string} codeName
 * @property {string|undefined} bucketRegion
 * @property {string|undefined} pathPrefix
 */

/**
 * @typedef ApiSecret
 * @property {string|undefined} accessKeyId
 * @property {string|undefined} secretAccessKey
 * @property {string|undefined} region
 */