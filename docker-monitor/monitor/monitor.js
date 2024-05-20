const Docker = require('dockerode');
const docker = new Docker();

const MAX_RESTARTS = 1;

async function getContainerRestarts(container) {
    try {
        const data = await container.inspect();
        return data.RestartCount;
    } catch (error) {
        console.error(`Error inspecting container ${container.id}:`, error);
        return -1;
    }
}

async function getImageDetails(ImageID) {
    try {
        const data = await docker.getImage(ImageID).inspect();
        return data;
    } catch (error) {
        console.error(`Error inspecting image ${ImageID}:`, error);
        return null;
    }
}

async function getPreviousImage(container) {
    try {
        const data = await container.inspect();
        const currentImageId = data.Image;

        const currentImageDetails = await getImageDetails(currentImageId);
        const currentImageRepoTags = currentImageDetails.RepoTags[0];
        const repoName = currentImageRepoTags.split(':')[0];

        const images = await docker.listImages();
        const filteredImages = images.filter((image) => {
            return image.RepoTags && image.RepoTags.some((tag) => tag.startsWith(repoName));
        });

        // Sort images by creation date
        filteredImages.sort((a, b) => new Date(b.Created) - new Date(a.Created));

        // Find the index of the current image
        const currentIndex = filteredImages.findIndex((image) => image.Id === currentImageId);

        if (currentIndex < 1) {
            console.error(`No previous image found for repository ${repoName}.`);
            return null;
        }

        // Get the image created just before the current one
        const previousImageTag = filteredImages[currentIndex - 1].RepoTags[0];
        return previousImageTag;
    } catch (error) {
        console.error(`Error getting previous image for container ${container.id}:`, error);
        return null;
    }
}

async function switchToPreviousImage(container, name) {
    const previousImage = await getPreviousImage(container);
    if (!previousImage) {
        console.error(`No previous image found for container ${name} - ${container.id}.`);
        return;
    }
    console.log('--- Performing switch to previous image... ---');

    console.log(`Switching container ${name} - ${container.id} to previous image ${previousImage}...`);

    try {
        // Stop the container
        await container.stop();
        console.log(`Stopped container ${name} - ${container.id}.`);

        // Remove the container
        await container.remove();
        console.log(`Removed container ${name} - ${container.id}.`);

        // Create and start a new container with the previous image
        const newContainer = await docker.createContainer({
            Image: previousImage,
            name: name,
        });
        await newContainer.start();
        console.log(`Switched container ${name} to previous image ${previousImage}.`);
    } catch (error) {
        console.error(`Error handling container ${name} - ${container.id}:`, error);
    }
}

async function outputSummary(containerDetails) {
    // Calculate column widths
    const columns = ['name', 'state', 'status', 'currentImageRepoTags', 'curImageID'];
    const columnWidths = {};

    for (const column of columns) {
        columnWidths[column] = Math.max(column.length, ...containerDetails.map((detail) => detail[column].length));
    }

    // Create a header row
    const headerRow = columns.map((column) => column.padEnd(columnWidths[column])).join(' | ');

    // Create rows for each container
    const rows = containerDetails.map((detail) => {
        return columns.map((column) => detail[column].padEnd(columnWidths[column])).join(' | ');
    });

    // Output the table
    console.log('');
    console.log(headerRow);
    console.log('-'.repeat(headerRow.length));
    for (const row of rows) {
        console.log(row);
    }
}

async function monitor() {
    while (true) {
        try {
            const containers = await docker.listContainers({ all: true });
            const containerDetails = [];

            for (const containerInfo of containers) {
                const container = docker.getContainer(containerInfo.Id);
                const curImageID = containerInfo.ImageID.replace('sha256:', '');
                const state = containerInfo.State;
                const status = containerInfo.Status;
                const name = containerInfo.Names[0].replace('/', '');
                const restarts = await getContainerRestarts(container);

                if (restarts > MAX_RESTARTS) {
                    await switchToPreviousImage(container, name);
                } else {
                    const curImage = await getImageDetails(curImageID);
                    const currentImageRepoTags = curImage.RepoTags[0];
                    containerDetails.push({
                        name,
                        state,
                        status,
                        currentImageRepoTags,
                        curImageID,
                    });
                }
            }
            await outputSummary(containerDetails);

            await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5 seconds
        } catch (error) {
            console.error('Error monitoring containers:', error);
        }
    }
}

monitor().catch((err) => console.error(`Monitoring failed: ${err}`));
