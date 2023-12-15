<script lang="ts">
    let imageFiles: FileList;
    let statusMessage = "Please Select a File";
    let imageTag: HTMLImageElement;
    let canvasTag: HTMLCanvasElement;
    let show_colors: boolean = false;
    let found_colors = [];

    type Color = {
        r: number;
        g: number;
        b: number;
    };

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
        // console.log(JSON.stringify(data));
    }

    function get_color_match(color: Color, data) {
        const found_colors = [];
        let closest_color;
        let closest_color_distrance = Number.MAX_SAFE_INTEGER;

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
                        if (color_distrance < closest_color_distrance) {
                            closest_color_distrance = color_distrance;
                            closest_color = {
                                name: `${current_name}::${colors.name}`,
                                color: converted_color,
                            };
                        }
                    }
                }
            }
        }
        // console.log(closest_color);
        // console.log(closest_color_distrance);
        found_colors.push(closest_color);
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

    // Helper function to ensure values are in the range [0, 1]
    function clamp(value: number, min: number = 0, max: number = 1): number {
        return Math.max(min, Math.min(value, max));
    }

    function calculate_color_distance(color1: Color, color2: Color): number {
        // Extract RGB values from each color
        const { r: r1, g: g1, b: b1 } = color1;
        const { r: r2, g: g2, b: b2 } = color2;

        // Calculate the Euclidean distance
        const distance = Math.sqrt(
            Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2),
        );

        return distance;
    }

    // althernate distrance calculations
    //
    //
    function calculateCIEDE2000(color1:Color, color2:Color) {
        const Lab1 = rgbToLab(color1);
        const Lab2 = rgbToLab(color2);

        const kL = 1;
        const kC = 1;
        const kH = 1;

        const deltaL = Lab2.L - Lab1.L;
        const Lbar = (Lab1.L + Lab2.L) / 2;

        const C1 = Math.sqrt(Lab1.a ** 2 + Lab1.b ** 2);
        const C2 = Math.sqrt(Lab2.a ** 2 + Lab2.b ** 2);
        const Cbar = (C1 + C2) / 2;

        const a1Prime =
            Lab1.a +
            (Lab1.a / 2) * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
        const a2Prime =
            Lab2.a +
            (Lab2.a / 2) * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));

        const C1Prime = Math.sqrt(a1Prime ** 2 + Lab1.b ** 2);
        const C2Prime = Math.sqrt(a2Prime ** 2 + Lab2.b ** 2);
        const CbarPrime = (C1Prime + C2Prime) / 2;

        const deltaCPrime = C2Prime - C1Prime;

        const h1Prime =
            Math.atan2(Lab1.b, a1Prime) + (Lab1.b < 0 ? 2 * Math.PI : 0);
        const h2Prime =
            Math.atan2(Lab2.b, a2Prime) + (Lab2.b < 0 ? 2 * Math.PI : 0);
        const deltahPrime = Math.abs(h1Prime - h2Prime);

        const deltaHPrime =
            deltahPrime > Math.PI ? 2 * Math.PI - deltahPrime : deltahPrime;

        const deltaE2000 = Math.sqrt(
            (deltaL / (kL * 1)) ** 2 +
                (deltaCPrime / (kC * 1)) ** 2 +
                (deltaHPrime / (kH * 1)) ** 2,
        );

        return deltaE2000;
    }

    function rgbToLab(rgb:Color) {
        let r = rgb.r / 255;
        let g = rgb.g / 255;
        let b = rgb.b / 255;

        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

        r *= 100;
        g *= 100;
        b *= 100;

        const X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
        const Y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
        const Z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;

        const epsilon = 0.008856;
        const kappa = 903.3;

        const Xr = 95.047;
        const Yr = 100.0;
        const Zr = 108.883;

        const xr = X / Xr;
        const yr = Y / Yr;
        const zr = Z / Zr;

        const fx = xr > epsilon ? Math.pow(xr, 1 / 3) : (kappa * xr + 16) / 116;
        const fy = yr > epsilon ? Math.pow(yr, 1 / 3) : (kappa * yr + 16) / 116;
        const fz = zr > epsilon ? Math.pow(zr, 1 / 3) : (kappa * zr + 16) / 116;

        const L = Math.max(0, 116 * fy - 16);
        const a = (fx - fy) * 500;
         b = (fy - fz) * 200;

        return { L, a, b };
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
