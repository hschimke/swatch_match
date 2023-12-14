<script lang="ts">
    // import {parse} from 'ase_parser';

    let imageFiles: FileList;
    let statusMessage = "Please Select a File";
    let imageTag: HTMLImageElement;
    let canvasTag: HTMLCanvasElement;

    function handleClick() {
        if (!imageFiles || imageFiles.length == 0) {
            statusMessage = "Please Select an Image";
        } else {
            statusMessage = `Found ${imageFiles.length} files`;
            imageTag.src = URL.createObjectURL(imageFiles[0]);
            imageTag.alt = "uploaded image";
            imageTag.onload = () => {
                parseImage(imageTag);
            };
        }
    }

    function parseImage(image: HTMLImageElement) {
        // const canvas = document.createElement("canvas");
        const canvas = canvasTag;
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(image, 0, 0, image.width, image.height);
        const imageData = ctx?.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
        ).data;
        const rbgValues: Set<{
            r: number;
            g: number;
            b: number;
        }> = new Set();
        for (let i = 0; i < imageData!.length; i += 4) {
            const rgb = {
                r: imageData![i],
                g: imageData![i + 1],
                b: imageData![i + 2],
            };
            rbgValues.add(rgb);
        }
        matchColors(rbgValues);
    }

    function matchColors(
        colorValues: Set<{
            r: number;
            g: number;
            b: number;
        }>,
    ) {
        console.log(colorValues)
        
    }
</script>

<h1>Welcome to the Off-Kolor Montana-Cans color matcher</h1>
<form>
    <input
        type="file"
        accept=".png,.jpg,.jpeg,.bmp,.gif"
        bind:files={imageFiles}
    />
    <button on:click={handleClick}>Process</button>
    <div>{statusMessage}</div>
</form>

<img bind:this={imageTag} width="200" />
<canvas bind:this={canvasTag} id="cvs" hidden={true} />
