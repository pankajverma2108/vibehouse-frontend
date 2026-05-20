
import React from 'react';

export interface AmenityItem {
    name: string;
    icon: string;
    description?: string;
}

export interface AmenityCategory {
    title: string;
    icon: React.ReactNode;
    color: string;
    items: AmenityItem[];
}

export interface AmenitiesData {
    [key: string]: AmenityCategory;
}


