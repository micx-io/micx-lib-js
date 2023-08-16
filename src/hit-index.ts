let state = sessionStorage.getItem("micx_hit_index");
if (state === null) {
    sessionStorage.setItem("micx_hit_index", "0");
}
sessionStorage.setItem("micx_hit_index", "" + (parseInt(sessionStorage.getItem("micx_hit_index") ?? "0") + 1));

export const hitIndex = parseInt(sessionStorage.getItem("micx_hit_index") ?? "0");
