package com.example.graph.repository;

import com.example.graph.model.User;
import org.springframework.data.neo4j.repository.Neo4jRepository;
import org.springframework.data.neo4j.repository.query.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRepository extends Neo4jRepository<User, String> {

    // 1. "People You May Know" (Social Discovery)
    // Find neighbors of neighbors who I don't follow yet
    @Query("MATCH (me:User {username: $username})-[:FOLLOWS]->(friend)-[:FOLLOWS]->(foaf:User) " +
           "WHERE NOT (me)-[:FOLLOWS]->(foaf) AND foaf <> me " +
           "RETURN foaf")
    List<User> findPeopleYouMayKnow(String username);

    // 2. Collaborative Filtering (Interest-based recommendation)
    // Find users who like the same things as me, and see what ELSE they like
    @Query("MATCH (me:User {username: $username})-[:LIKES]->(i:Interest)<-[:LIKES]-(other:User) " +
           "MATCH (other)-[:LIKES]->(rec:Interest) " +
           "WHERE NOT (me)-[:LIKES]->(rec) " +
           "RETURN DISTINCT rec.name")
    List<String> recommendInterests(String username);
    
    // 3. Fraud Detection: Bot Ring detection
    // Find users who are part of a strongly connected cluster (following each other in a circle)
    @Query("MATCH (u1:User)-[:FOLLOWS]->(u2:User)-[:FOLLOWS]->(u3:User)-[:FOLLOWS]->(u1) " +
           "RETURN DISTINCT u1")
    List<User> detectPotentialBotRings();
}
