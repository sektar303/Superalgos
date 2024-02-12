exports.newOpenStorageUtilitiesStorageFactory = {
    createStorageClient: function createStorageClient(params) {
    }
}

function createStorageClient(containerType) {
    switch (containerType) {
        case 'Github Storage Container': {
            return SA.projects.openStorage.utilities.githubStorage
        }
        case 'AWS S3 Storage Container': {
            return SA.projects.openStorage.utilities.awsS3Storage
        }
        case 'Superalgos Storage Container': {
            // TODO Build the Superalgos Storage Provider
            break
        }
    }
}