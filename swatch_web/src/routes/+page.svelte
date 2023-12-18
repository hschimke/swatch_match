<script lang="ts">
    import type { Color, ColorDistranceArray } from "$lib";
    import { calculateCIEDE2000 } from "$lib/perceptual_color_distrance";
    import type { AseColorEntry } from "adobe_swatch_exchange_parser";
    import type { AseParsedFilePayload } from "./api/get_available_swatches/+server";
    import { quantization } from "$lib/color_filtering";
    import { convert_cmyk_rgb } from "$lib/cmyk_to_rgb_conversion";
    import { external_color_diff } from "$lib/external_color_diff";

    let imageFiles: FileList;
    let statusMessage = "Please Select a File";
    let button_disabled = false;
    let imageTag: HTMLImageElement;
    let canvasTag: HTMLCanvasElement;
    let show_colors: boolean = false;
    let found_colors: Array<{
        color: Color;
        found_colors: Array<{ name: string; color: Color }>;
    }> = [];
    let color_swatch_count = "0";

    function handleClick() {
        show_colors = false;
        button_disabled = true;
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

    async function parseImage(image: HTMLImageElement) {
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

        // console.log(rgbs.length);

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

        let reduced_colors;
        if (color_swatch_count != "0" && color_swatch_count != "-1") {
            reduced_colors = quantization(
                rgb_filtered,
                0,
                Number(color_swatch_count),
            );
        } else {
            reduced_colors = rgb_filtered;
        }

        // console.log(reduced_colors.length);

        const rbgValues = reduced_colors;
        matchColors(rbgValues);
    }

    async function matchColors(colorValues: Array<Color>) {
        statusMessage = `Matching Colors`;
        // console.log(colorValues);
        found_colors.length = 0;
        let payload = await fetch("/api/get_available_swatches");
        let data = (await payload.json()) as AseParsedFilePayload;
        // for (const f of data) {
        //     console.log(f)
        // }
        // let color_pos = 0;
        // const len = colorValues.size;
        for (const color of colorValues) {
            found_colors.push({
                color: color,
                found_colors: await get_color_match(color, data),
            });
            // color_pos += 1;

            // console.log(`Matching Colors ${(color_pos / len) * 100}%`);
            // statusMessage = `Matching Colors ${(color_pos / len) * 100}%`;
        }

        // group the colors if that's what the user wants
        if (color_swatch_count == "-1") {
            statusMessage = "grouping colors";
            const color_matched_set = new Set();
            const filtered_found_colors = found_colors.filter((fc) => {
                const color_names: string[] = [];
                for (const c of fc.found_colors) {
                    color_names.push(c.name);
                }
                const color_name_set = color_names.join("|");
                // console.log( color_matched_set );
                if (!color_matched_set.has(color_name_set)) {
                    color_matched_set.add(color_name_set);
                    return true;
                } else {
                    return false;
                }
            });
            // console.log(found_colors.length, filtered_found_colors.length)
            found_colors = filtered_found_colors;
        }

        show_colors = true;
        statusMessage = "";
        button_disabled = false;
        // console.log(JSON.stringify(data));
    }

    async function get_color_match(color: Color, data: AseParsedFilePayload) {
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
                } else if (
                    colors.type == "group" &&
                    typeof colors.entries != "undefined"
                ) {
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
            return a.distance - b.distance;
        });

        // add three closest
        located_colors.push(color_distrance_hold[0]);
        located_colors.push(color_distrance_hold[1]);
        located_colors.push(color_distrance_hold[2]);
        // located_colors.push(color_distrance_hold[4]);

        // console.log(closest_color);
        // console.log(closest_color_distrance);
        // found_colors.push(closest_color);
        return located_colors;
    }

    function handle_color(
        target_color: Color,
        found_color: AseColorEntry,
        current_name: string,
        color_distrance_array: ColorDistranceArray,
    ) {
        if (found_color.name.includes("=")) {
            return;
        }

        if (typeof found_color.color == "undefined") {
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
            // console.log("color match");
            color_distrance_array.push({
                name: `EXACT COLOR: ${current_name} - ${found_color.name}`,
                color: converted_color,
                distance: 0,
            });
        } else {
            const color_distrance = external_color_diff(
                target_color,
                converted_color,
            );
            color_distrance_array.push({
                name: `${current_name} - ${found_color.name}`,
                color: converted_color,
                distance: color_distrance,
            });
        }
    }
</script>

<h1>Off-Kolor Montana-Cans color matcher</h1>
<form>
    <input
        type="file"
        accept=".png,.jpg,.jpeg,.bmp,.gif"
        bind:files={imageFiles}
    />
    <select bind:value={color_swatch_count}>
        <option value="-1">Group</option>
        <option value="0">All</option>
        <option value="1">2</option>
        <option value="2">4</option>
        <option value="3">8</option>
        <option value="4">16</option>
        <option value="5">32</option>
        <option value="6">64</option>
        <option value="7">128</option>
        <option value="8">256</option>
    </select>
    <button on:click={handleClick} disabled={button_disabled}>Process</button>
</form>

<img id="ImageTag" bind:this={imageTag} height="200" alt="Select a File" />

<div id="StatusMessage">{statusMessage}</div>

{#if show_colors}
    <table id="ResultTable">
        <thead>
            <tr>
                <td>Color</td>
                <td>Closest Matches</td>
            </tr>
        </thead>
        <tbody>
            {#each found_colors as color}
                <tr>
                    <td>
                        <div
                            style="height: 50px; width: 50px; display: block; background-color: rgb({color
                                .color.r},{color.color.g},{color.color.b});"
                        ></div>
                    </td>
                    <td>
                        {#each color.found_colors as fnd_color}
                            <div style="clear:left;">
                                <div
                                    style="height: 50px; width: 50px; display: block; background-color: rgb({fnd_color
                                        .color.r},{fnd_color.color.g},{fnd_color
                                        .color.b}); float: left;"
                                ></div>
                                <div
                                    style="float:left; height=50px; line-height: 50px; text-allign:center; margin-left: 5px;"
                                >
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

<canvas bind:this={canvasTag} id="cvs" hidden={true} />

<style>
    form {
        padding-bottom: 10px;
        display: block;
    }

    #StatusMessage {
        padding-bottom: 10px;
    }
</style>
