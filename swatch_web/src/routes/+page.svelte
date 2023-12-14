<script lang="ts">
    let imageFiles: FileList;
    let statusMessage = "Please Select a File";
    let imageTag: HTMLImageElement;
    let canvasTag: HTMLCanvasElement;
    let show_colors: boolean = false;
    let found_colors = [];

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

    async function matchColors(
        colorValues: Set<{
            r: number;
            g: number;
            b: number;
        }>,
    ) {
        // console.log(colorValues);
        found_colors.length = 0;
        let payload = await fetch("/api/get_available_swatches");
        let data = await payload.json();
        // for (const f of data) {
        //     console.log(f)
        // }
        for (const color of colorValues) {
            found_colors.push({
                color: color,
                found_color: get_color_match(color, data),
            });
        }
        show_colors = true;
        // console.log(JSON.stringify(data));
    }

    function get_color_match(
        color: {
            r: number;
            g: number;
            b: number;
        },
        data,
    ) {
        const found_colors = [];
        for (const ase_file of data) {
            const current_name = ase_file.file;
            // console.log(current_name)
            for (const colors of ase_file.colors) {
                if (colors.type == "color") {
                    const converted_color = convert_cmyk_rgb(colors.color.c, colors.color.m, colors.color.y, colors.color.k);
                    // console.log(JSON.stringify(converted_color));
                    if (color.r == converted_color.r && color.g == converted_color.g && color.b == converted_color.b ) {
                        // console.log('color match')
                        found_colors.push(`${current_name}::${colors.name}`)
                    }
                }
            }
        }
        return found_colors;
    }

    function convert_cmyk_rgb(c, m, y, k) {
        // Ensure values are in the range [0, 1]
        c = clamp(c);
        m = clamp(m);
        y = clamp(y);
        k = clamp(k);

        // Convert CMYK to RGB
        const r = Math.round(255 * (1 - c) * (1 - k));
        const g = Math.round(255 * (1 - m) * (1 - k));
        const b = Math.round(255 * (1 - y) * (1 - k));

        return { r, g, b };
    }

    function rgbToHex(r, g, b) {
        // Ensure values are in the range [0, 255]
        r = clamp(r, 0, 255);
        g = clamp(g, 0, 255);
        b = clamp(b, 0, 255);

        // Convert RGB to hex
        const hexValue = ((r << 16) | (g << 8) | b)
            .toString(16)
            .padStart(6, "0");

        return `#${hexValue.toLowerCase()}`;
    }

    // Helper function to ensure values are in the range [0, 1]
    function clamp(value) {
        return Math.max(0, Math.min(value, 1));
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

<img bind:this={imageTag} width="200" alt="Uploaded data" />
<canvas bind:this={canvasTag} id="cvs" hidden={true} />

{#if show_colors}
    <table>
        <thead>
            <tr>
                <td>Color</td>
                <td>Closest Match</td>
            </tr>
        </thead>
        <tbody>
            {#each found_colors as color}
                <tr>
                    <td>
                        <div
                            style="height: 50px; width: 50px; display: block; background-color: rgb({color
                                .color.r},{color.color.g},{color.color.b});"
                        >
                            <!--rgb({color.color.r},{color.color.g},{color.color.b})-->
                        </div>
                    </td>
                    <td>
                        {JSON.stringify(color.found_color)}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}
