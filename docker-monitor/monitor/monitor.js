const { exec } = require('child_process');
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

async function getPreviousImage(container) {
    try {
        const data = await container.inspect();
        const currentImageId = data.Image;

        const currentImageDetails = await docker.getImage(currentImageId).inspect();
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

async function switchToPreviousImage(container) {
    const previousImage = await getPreviousImage(container);
    if (!previousImage) {
        console.error(`No previous image found for container ${container.id}.`);
        return;
    }

    console.log(`Switching container ${container.id} to previous image ${previousImage}...`);

    try {
        // Stop the container
        await container.stop();
        console.log(`Stopped container ${container.id}.`);

        // Remove the container
        await container.remove();
        console.log(`Removed container ${container.id}.`);

        // Run a new container with the previous image
        exec(`docker run -d --name ${container.id} ${previousImage}`, (err, stdout, stderr) => {
            if (err) {
                console.error(`Error starting container with previous image ${previousImage}: ${stderr}`);
                return;
            }
            console.log(`Switched container ${container.id} to previous image.`);
        });
    } catch (error) {
        console.error(`Error handling container ${container.id}:`, error);
    }
}

async function monitor() {
    while (true) {
        try {
            const containers = await docker.listContainers({ all: true });

            for (const containerInfo of containers) {
                const container = docker.getContainer(containerInfo.Id);
                const restarts = await getContainerRestarts(container);
                console.log(`Container ${containerInfo.Names[0]} restarts: ${restarts}`);

                if (restarts > MAX_RESTARTS) {
                    await switchToPreviousImage(container);
                }
            }

            await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5 seconds
        } catch (error) {
            console.error('Error monitoring containers:', error);
        }
    }
}

monitor().catch((err) => console.error(`Monitoring failed: ${err}`));
