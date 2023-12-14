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
        console.log(rgb_filtered.length);

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
                found_color: get_color_match(color, data),
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
                        // console.log('color match')
                        found_colors.push(`${current_name}::${colors.name}`);
                    } else {
                        const color_distrance = calculate_color_distance(
                            color,
                            converted_color,
                        );
                        if (color_distrance < closest_color_distrance) {
                            closest_color_distrance = color_distrance;
                            closest_color = `${current_name}::${colors.name}`;
                        }
                    }
                }
            }
        }
        console.log(closest_color);
        console.log(closest_color_distrance);
        found_colors.push(closest_color);
        return found_colors;
    }

    function convert_cmyk_rgb(c, m, y, k): Color {
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

    function ciede2000(rgb1, rgb2) {
  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);

  const deltaL = lab2.L - lab1.L;
  const avgL = (lab1.L + lab2.L) / 2;
  const avgC = (lab1.C + lab2.C) / 2;
  const deltaA = lab2.a - lab1.a;
  const deltaB = lab2.b - lab1.b;

  const avgH = Math.sqrt(Math.pow(deltaA, 2) + Math.pow(deltaB, 2) + Math.pow(avgC, 2));
  const h1 = calculateLabH(lab1.a, lab1.b);
  const h2 = calculateLabH(lab2.a, lab2.b);
  const deltah = calculateDeltaH(h1, h2, avgC);

  const cieDE2000 = Math.sqrt(
    Math.pow(deltaL, 2) +
    Math.pow(deltaA, 2) +
    Math.pow(deltaB, 2) +
    Math.pow(deltah / (1 + 0.045 * avgC), 2)
  );

  return cieDE2000;
}

function rgbToLab(rgb) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  let b = rgb.b / 255;

  const x = 0.4124564 * linearize(r) + 0.3575761 * linearize(g) + 0.1804375 * linearize(b);
  const y = 0.2126729 * linearize(r) + 0.7151522 * linearize(g) + 0.0721750 * linearize(b);
  const z = 0.0193339 * linearize(r) + 0.1191920 * linearize(g) + 0.9503041 * linearize(b);

  const xRef = 0.9642;
  const yRef = 1.0000;
  const zRef = 0.8249;

  const fx = pivot(x / xRef);
  const fy = pivot(y / yRef);
  const fz = pivot(z / zRef);

  const L = Math.max(0, 116 * fy - 16);
  const a = (fx - fy) * 500;
   b = (fy - fz) * 200;

  const C = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
  const h = calculateLabH(a, b);

  return { L, a, b, C, h };
}

function calculateLabH(a, b) {
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return (h >= 0) ? h : h + 360;
}

function calculateDeltaH(h1, h2, avgC) {
  const deltah = Math.abs(h1 - h2);
  if (deltah <= 180) {
    return deltah;
  } else if (h2 <= h1) {
    return deltah - 360;
  } else {
    return deltah + 360;
  }
}

function linearize(value) {
  return (value <= 0.04045) ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function pivot(value) {
  const threshold = 0.008856;
  return (value > threshold) ? Math.pow(value, 1 / 3) : (903.3 * value + 16) / 116;
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
