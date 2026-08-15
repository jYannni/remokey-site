// Single source of truth. The support address also exists in the app repo at
// Packages/RemoteKeyboardKit/Sources/RemoteKeyboardKit/ReportDestination.swift
// and the two MUST match — that address is compiled into every shipped binary,
// so a mismatch means users mail an inbox nobody reads, with no error anywhere.

export const SITE_URL = 'https://remokey.app';
export const SUPPORT_EMAIL = 'support@remokey.app';
export const PRODUCT_NAME = 'ReMoKey';
