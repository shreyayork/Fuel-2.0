import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyLocationCityChange,
  applyLocationCountryChange,
  applyLocationStateChange,
  countryHasSubdivisions,
  listCountries,
  listSubdivisions,
  normalizeLocationForForm,
  resolveCountry,
  resolveSubdivision,
} from "./index";

describe("geo countries + subdivisions", () => {
  it("lists ISO countries including United States", () => {
    const us = listCountries().find((c) => c.code === "US");
    assert.ok(us);
    assert.equal(us?.name, "United States");
  });

  it("resolves country codes and names to display names", () => {
    assert.deepEqual(resolveCountry("US"), {
      code: "US",
      name: "United States",
      matched: true,
    });
    assert.deepEqual(resolveCountry("United States"), {
      code: "US",
      name: "United States",
      matched: true,
    });
    assert.deepEqual(resolveCountry("USA"), {
      code: "US",
      name: "United States",
      matched: true,
    });
  });

  it("preserves unmatched legacy country values", () => {
    assert.deepEqual(resolveCountry("Weirdlandia"), {
      code: null,
      name: "Weirdlandia",
      matched: false,
    });
  });

  it("filters subdivisions by country", () => {
    const usStates = listSubdivisions("US");
    assert.ok(usStates.some((s) => s.code === "MA" && s.name === "Massachusetts"));
    assert.equal(listSubdivisions("ZZ").length, 0);
  });

  it("resolves state codes and names within a country", () => {
    assert.deepEqual(resolveSubdivision("US", "MA"), {
      code: "MA",
      name: "Massachusetts",
      matched: true,
    });
    assert.deepEqual(resolveSubdivision("US", "Massachusetts"), {
      code: "MA",
      name: "Massachusetts",
      matched: true,
    });
  });

  it("preserves unmatched legacy state values", () => {
    assert.deepEqual(resolveSubdivision("US", "Mass."), {
      code: null,
      name: "Mass.",
      matched: false,
    });
  });

  it("reports countries without subdivisions", () => {
    assert.equal(countryHasSubdivisions("US"), true);
    assert.equal(countryHasSubdivisions("VA"), false);
  });

  it("normalizes location form fields and keeps custom cities", () => {
    const loc = normalizeLocationForForm({
      country: "US",
      stateRegion: "MA",
      city: "Somerville",
    });
    assert.equal(loc.country, "United States");
    assert.equal(loc.stateRegion, "Massachusetts");
    assert.equal(loc.city, "Somerville");
    assert.equal(loc.countryCode, "US");
  });

  it("keeps mismatched legacy location strings", () => {
    const loc = normalizeLocationForForm({
      country: "Atlantis",
      stateRegion: "Central",
      city: "Poseidon",
    });
    assert.equal(loc.country, "Atlantis");
    assert.equal(loc.stateRegion, "Central");
    assert.equal(loc.city, "Poseidon");
    assert.equal(loc.countryCode, null);
  });
});

describe("location form field patches", () => {
  const scrapedCityOnly = {
    country: "United States",
    stateRegion: "",
    city: "Austin",
  };

  it("selecting state preserves an already-set city", () => {
    const next = applyLocationStateChange(scrapedCityOnly, "Texas");
    assert.deepEqual(next, {
      country: "United States",
      stateRegion: "Texas",
      city: "Austin",
    });
  });

  it("editing city preserves an already-set state", () => {
    const next = applyLocationCityChange(
      { country: "United States", stateRegion: "Texas", city: "Austin" },
      "Dallas",
    );
    assert.deepEqual(next, {
      country: "United States",
      stateRegion: "Texas",
      city: "Dallas",
    });
  });

  it("changing country still clears state and city (cascade)", () => {
    assert.deepEqual(applyLocationCountryChange("Canada"), {
      country: "Canada",
      stateRegion: "",
      city: "",
    });
  });
});
