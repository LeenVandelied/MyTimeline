package com.matimeline.eventmanager.infrastructure.adapters.repositories.jpa;

import org.springframework.stereotype.Component;

import com.matimeline.eventmanager.domain.models.export.ExportFormat;
import com.matimeline.eventmanager.domain.models.export.ExportJob;
import com.matimeline.eventmanager.domain.models.export.ExportJobStatus;
import com.matimeline.eventmanager.infrastructure.entities.ExportJobEntity;

/**
 * Mapper {@link ExportJobEntity} <-> {@link ExportJob} (#58). Situé côté INFRASTRUCTURE
 * (et non {@code application.mappers}) : c'est l'adaptateur qui connaît l'entité JPA, ce qui
 * respecte strictement la règle de dépendance hexagonale (contrairement aux mappers
 * applicatifs historiques, gelés dans la baseline ArchUnit). Les enums domaine sont persistés
 * par leur nom (varchar borné par les CHECK de V13).
 */
@Component
public class ExportJobMapper {

    public ExportJob toDomain(ExportJobEntity entity) {
        return new ExportJob(
                entity.getId(),
                entity.getUserId(),
                ExportFormat.valueOf(entity.getFormat()),
                ExportJobStatus.valueOf(entity.getStatus()),
                entity.getStorageRef(),
                entity.getErrorCode(),
                entity.getCreatedAt(),
                entity.getCompletedAt(),
                entity.getExpiresAt());
    }

    public ExportJobEntity toEntity(ExportJob job) {
        ExportJobEntity entity = new ExportJobEntity();
        entity.setId(job.getId());
        entity.setUserId(job.getOwnerId());
        entity.setFormat(job.getFormat().name());
        entity.setStatus(job.getStatus().name());
        entity.setStorageRef(job.getStorageRef());
        entity.setErrorCode(job.getErrorCode());
        entity.setCreatedAt(job.getCreatedAt());
        entity.setCompletedAt(job.getCompletedAt());
        entity.setExpiresAt(job.getExpiresAt());
        return entity;
    }
}
