<script lang="ts">
    import type { Color } from "$lib";
    import { calculateCIEDE2000 } from "$lib/perceptual_color_distrance";
    import type { AseColorEntry } from "adobe_swatch_exchange_parser";
    import type { AseParsedFilePayload } from "./api/get_available_swatches/+server";

    let imageFiles: FileList;
    let statusMessage = "Please Select a File";
    let imageTag: HTMLImageElement;
    let canvasTag: HTMLCanvasElement;
    let show_colors: boolean = false;
    let found_colors : Array<{
        color: Color,
        found_colors: Array<{name: string, color:Color}>
    }>= [];

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
        let data = await payload.json() as AseParsedFilePayload;
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

    type ColorDistranceArray = Array<{
        name: string;
        color: Color;
        distrance: number;
    }>;

    function get_color_match(color: Color, data : AseParsedFilePayload) {
        const located_colors = [];

        const color_distrance_hold: ColorDistranceArray = [];

        for (const ase_file of data) {
            const current_name = ase_file.file;
            // console.log(current_name)
            for (const colors of ase_file.colors) {
                if (colors.type == "color") {
                    handle_color(
                        color,
                        colors,
                        current_name,
                        color_distrance_hold,
                    );
                } else if (colors.type == "group" && typeof colors.entries != 'undefined')  {
                    for (const color_group_entry of colors.entries) {
                        if (color_group_entry.type == "color") {
                            handle_color(
                                color,
                                color_group_entry,
                                current_name,
                                color_distrance_hold,
                            );
                        }
                    }
                }
            }
        }

        // sort distrances
        color_distrance_hold.sort((a, b) => {
            return a.distrance - b.distrance;
        });

        // add three closest
        located_colors.push(color_distrance_hold[0]);
        located_colors.push(color_distrance_hold[1]);
        located_colors.push(color_distrance_hold[2]);
        located_colors.push(color_distrance_hold[4]);

        // console.log(closest_color);
        // console.log(closest_color_distrance);
        // found_colors.push(closest_color);
        return located_colors;
    }

    function handle_color(
        target_color: Color,
        found_color : AseColorEntry,
        current_name: string,
        color_distrance_array: ColorDistranceArray,
    ) {
        if (found_color.name.includes("=")) {
            return;
        }

        if (typeof found_color.color == 'undefined') {
            return;
        }

        const converted_color = convert_cmyk_rgb(
            found_color.color.c,
            found_color.color.m,
            found_color.color.y,
            found_color.color.k,
        );
        // console.log(JSON.stringify(converted_color));
        if (
            target_color.r == converted_color.r &&
            target_color.g == converted_color.g &&
            target_color.b == converted_color.b
        ) {
            console.log("color match");
            color_distrance_array.push({
                name: `${current_name}::${found_color.name}`,
                color: converted_color,
                distrance: 0,
            });
        } else {
            const color_distrance = calculateCIEDE2000(
                target_color,
                converted_color,
            );
            color_distrance_array.push({
                name: `${current_name}::${found_color.name}`,
                color: converted_color,
                distrance: color_distrance,
            });
        }
    }

    function convert_cmyk_rgb(
        c: number = 0,
        m: number = 0,
        y: number = 0,
        k: number = 0,
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
