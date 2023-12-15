<script lang="ts">
    import type { Color } from "$lib";
    import { calculateCIEDE2000 } from "$lib/perceptual_color_distrance";

    let imageFiles: FileList;
    let statusMessage = "Please Select a File";
    let imageTag: HTMLImageElement;
    let canvasTag: HTMLCanvasElement;
    let show_colors: boolean = false;
    let found_colors = [];

    function handleClick() {
        show_colors = false;
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
        statusMessage = `Analyzing image`;
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
        const rgbs = [];
        for (let i = 0; i < imageData!.length; i += 4) {
            const rgb = {
                r: imageData![i],
                g: imageData![i + 1],
                b: imageData![i + 2],
            };
            rgbs.push(rgb);
        }

        const v_f = new Set();
        const rgb_filtered = rgbs.filter((v) => {
            const pred = `${v.r}|${v.g}|${v.b}`;
            if (!v_f.has(pred)) {
                v_f.add(pred);
                return true;
            } else {
                return false;
            }
        });
        // console.log(rgb_filtered.length);

        const rbgValues: Set<Color> = new Set(rgb_filtered);
        matchColors(rbgValues);
    }

    async function matchColors(colorValues: Set<Color>) {
        statusMessage = `Matching Colors`;
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
                found_colors: get_color_match(color, data),
            });
        }
        show_colors = true;
        statusMessage = "";
        // console.log(JSON.stringify(data));
    }

    function get_color_match(color: Color, data) {
        const found_colors = [];

        const color_distrance_hold: Array<{
            name: string;
            color: Color;
            distrance: number;
        }> = [];

        // let closest_color;
        // let closest_color_distrance = Number.MAX_SAFE_INTEGER;

        for (const ase_file of data) {
            const current_name = ase_file.file;
            // console.log(current_name)
            for (const colors of ase_file.colors) {
                if (colors.type == "color") {
                    const converted_color = convert_cmyk_rgb(
                        colors.color.c,
                        colors.color.m,
                        colors.color.y,
                        colors.color.k,
                    );
                    // console.log(JSON.stringify(converted_color));
                    if (
                        color.r == converted_color.r &&
                        color.g == converted_color.g &&
                        color.b == converted_color.b
                    ) {
                        console.log("color match");
                        found_colors.push({
                            name: `${current_name}::${colors.name}`,
                            color: converted_color,
                        });
                    } else {
                        const color_distrance = calculateCIEDE2000(
                            color,
                            converted_color,
                        );
                        color_distrance_hold.push( {
                            name: `${current_name}::${colors.name}`,
                            color: converted_color,
                            distrance: color_distrance
                        });
                        // if (color_distrance < closest_color_distrance) {
                        //     closest_color_distrance = color_distrance;
                        //     closest_color = {
                        //         name: `${current_name}::${colors.name}`,
                        //         color: converted_color,
                        //     };
                        // }
                    }
                }
            }
        }

        // sort distrances
        color_distrance_hold.sort((a,b) => {
            return a.distrance - b.distrance
        })

        // add three closest
        found_colors.push(color_distrance_hold[0]);
        found_colors.push(color_distrance_hold[1]);
        found_colors.push(color_distrance_hold[2]);
        found_colors.push(color_distrance_hold[4]);

        // console.log(closest_color);
        // console.log(closest_color_distrance);
        // found_colors.push(closest_color);
        return found_colors;
    }

    function convert_cmyk_rgb(
        c: number,
        m: number,
        y: number,
        k: number,
    ): Color {
        // Ensure values are in the range [0, 1]
        c = c / 100;
        m = m / 100;
        y = y / 100;
        k = k / 100;

        // Convert CMYK to RGB
        const r = Math.round(255 * (1 - c) * (1 - k));
        const g = Math.round(255 * (1 - m) * (1 - k));
        const b = Math.round(255 * (1 - y) * (1 - k));

        // console.log(`${c},${m},${y},${k} -> ${r},${g},${b}`)
        return { r, g, b };
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
                        {#each color.found_colors as fnd_color}
                            <div style="clear:left;">
                                <div
                                    style="height: 50px; width: 50px; display: block; background-color: rgb({fnd_color
                                        .color.r},{fnd_color.color.g},{fnd_color
                                        .color.b}); float: left;"
                                ></div>
                                <div style="float:left; height=50px;">
                                    {fnd_color.name}
                                </div>
                            </div>
                        {/each}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}